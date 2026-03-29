<?php

namespace Bookit\Classes\Payments;

use Bookit\Classes\Admin\SettingsController;
use Bookit\Classes\Database\Appointments;

class Razorpay {

	private $price;
	private $appointment_id;
	private $service_title;
	private $service_id;
	private $customer_email;
	private $description;

	private $key_id;
	private $key_secret;

	/**
	 * Razorpay constructor.
	 *
	 * @param float  $price
	 * @param int    $appointment_id
	 * @param string $service_title
	 * @param int    $service_id
	 * @param string $customer_email
	 * @param string $description
	 */
	public function __construct( $price = 0, $appointment_id = 0, $service_title = '', $service_id = 0, $customer_email = '', $description = '' ) {
		$this->price         = $price;
		$this->appointment_id = $appointment_id;
		$this->service_title = $service_title;
		$this->service_id    = $service_id;
		$this->customer_email = $customer_email;
		$this->description   = $description;

		$settings = SettingsController::get_settings();
		$payments = $settings['payments'] ?? array();

		if ( ! empty( $payments['razorpay'] ) && ! empty( $payments['razorpay']['enabled'] ) ) {
			$razorpay         = $payments['razorpay'];
			$this->key_id     = $razorpay['key_id'] ?? '';
			$this->key_secret = $razorpay['key_secret'] ?? '';
		}
	}

	/**
	 * Create hosted payment link and return redirect URL.
	 *
	 * @return string
	 */
	public function generate_payment_url() {
		if ( empty( $this->key_id ) || empty( $this->key_secret ) || empty( $this->appointment_id ) ) {
			return '';
		}

		$currency = strtoupper( get_option_by_path( 'bookit_settings.currency' ) ?: SettingsController::$default_currency );
		$amount   = (int) round( (float) $this->price * 100 );

		if ( $amount <= 0 ) {
			return '';
		}

		$description = $this->description ?: sprintf( 'Bookit appointment #%d', (int) $this->appointment_id );
		$callback    = add_query_arg(
			array(
				'stm_bookit_check_razorpay' => 1,
			),
			home_url( '/' )
		);

		$body = array(
			'amount'              => $amount,
			'currency'            => $currency,
			'description'         => wp_strip_all_tags( $description ),
			'reference_id'        => (string) $this->appointment_id,
			'callback_url'        => $callback,
			'callback_method'     => 'get',
			'expire_by'           => time() + HOUR_IN_SECONDS,
			'notes'               => array(
				'appointment_id' => (string) $this->appointment_id,
				'service_id'     => (string) $this->service_id,
			),
			'customer'            => array(
				'email' => sanitize_email( $this->customer_email ),
			),
			'remind'              => 1,
			'accept_partial'      => false,
			'first_min_partial_amount' => 0,
		);

		$response = wp_remote_post(
			'https://api.razorpay.com/v1/payment_links',
			array(
				'timeout' => 20,
				'headers' => array(
					'Authorization' => 'Basic ' . base64_encode( $this->key_id . ':' . $this->key_secret ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
					'Content-Type'  => 'application/json',
				),
				'body'    => wp_json_encode( $body ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return '';
		}

		$code     = wp_remote_retrieve_response_code( $response );
		$response = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 !== $code && 201 !== $code ) {
			return '';
		}

		return isset( $response['short_url'] ) ? esc_url_raw( $response['short_url'] ) : '';
	}

	/**
	 * Verify callback and update appointment payment status.
	 *
	 * @param array $request
	 */
	public function check_payment( $request ) {
		if ( empty( $request['razorpay_payment_link_status'] ) || empty( $request['razorpay_payment_link_reference_id'] ) ) {
			return;
		}

		$appointment_id = absint( $request['razorpay_payment_link_reference_id'] );
		$status         = sanitize_text_field( wp_unslash( $request['razorpay_payment_link_status'] ) );

		if ( ! $appointment_id ) {
			return;
		}

		if ( 'paid' === strtolower( $status ) ) {
			Appointments::change_payment_status( $appointment_id, 'complete' );
			do_action( 'bookit_payment_complete', $appointment_id );
		} else {
			Appointments::change_payment_status( $appointment_id, 'rejected' );
		}

		wp_safe_redirect( home_url( '/' ) );
		exit;
	}
}
