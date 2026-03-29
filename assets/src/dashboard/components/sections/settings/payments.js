import stripeConnect from '@dashboard-addons/payments/stripe-connect';
import paypal from '@dashboard-addons/payments/paypal';
import stripe from '@dashboard-addons/payments/stripe';
import woocommerce from '@dashboard-addons/payments/woocommerce';
import addon_feature from '@dashboard-partials/addon-feature';

import temp_pro from '@dashboard-addons/payments/temp-pro';

export default {
	template: `
	      <div v-if="isPaymentsReady" class="payments-tabs">
        <div class="setting-row pt-10">
          <div class="form-group small no-margin">
            <span class="label">{{ translations.pay_locally }}</span>
          </div>
          <div class="form-group small no-margin">
            <div class="switcher">
              <div class="bookit-switch">
                <input type="checkbox" v-model="settings_object.payments.locally.enabled">
                <label></label>
              </div>
            </div>
            <span class="label for-switcher" v-html=" settings_object.payments.locally.enabled ? translations.enabled : translations.disabled"></span>
          </div>
        </div>

        <div class="setting-row no-border pb-10 pt-30">
          <div class="form-group small no-margin">
            <span class="label">Razorpay</span>
          </div>
          <div class="form-group small no-margin">
            <div class="switcher">
              <div class="bookit-switch">
                <input type="checkbox" v-model="settings_object.payments.razorpay.enabled">
                <label></label>
              </div>
            </div>
            <span class="label for-switcher" v-html=" settings_object.payments.razorpay.enabled ? translations.enabled : translations.disabled"></span>
          </div>
        </div>
        <div v-if="settings_object.payments.razorpay.enabled" class="setting-row pt-10">
          <div class="form-group small">
            <label>{{ translations.razorpay_key_id }}</label>
            <input type="text" v-model="settings_object.payments.razorpay.key_id">
          </div>
          <div class="form-group small">
            <label>{{ translations.razorpay_key_secret }}</label>
            <input type="text" v-model="settings_object.payments.razorpay.key_secret">
          </div>
        </div>

        <!-- PayPal and StripeConnect components -->
        <component
            v-for="paymentName in ['stripeConnect', 'paypal']"
            :key="paymentName"
            :is="paymentName"
            :addon="paymentAddon"
            :payment="findPayment(paymentName)"
            :settings_object="settings_object"
            :gateways="gateways">
        </component>

        <!-- Load bookit payments addon data -->
        <div :class="{'no-addon':!paymentAddon.isCanUse }">
          <component
              v-for="payment in addonPayments"
              v-if="payment.name !== 'stripeConnect' && payment.name !== 'paypal'"
              :key="payment.name"
              :is="payment.name"
              :addon="paymentAddon"
              :payment="payment"
              :settings_object="settings_object"
              :gateways="gateways">
          </component>

          <!-- IF ADDON NOT INSTALLED -->
          <div class='' v-if="showNotInstalledAddon()">
            <addon_feature :freemius="paymentAddonRaw.freemius" :addon="paymentAddonRaw" addonSlug="payments" :addonLink="paymentAddon.link"></addon_feature>
          </div>
          <!-- IF ADDON NOT INSTALLED END -->
          
          <!-- IF ADDON INSTALLED BUT NO LICENSE-->
          <div class='' v-if="showActivationLink()">
            <div class="addon-feature activation">
            <span class="addon-icon">
              <i :class="paymentAddonRaw.name"></i>
            </span>
              <h2 class="title">{{ paymentAddon.title }}</h2>
              <p class="activation-link" v-html="paymentAddon.activationLink"></p>
            </div>
          </div>
          <!-- IF ADDON INSALLED BUT NO LICENSE END-->
        </div>
      </div>
      <div v-else class="payments-tabs"></div>
	`,
	components: {
		stripeConnect,
		paypal,
		stripe,
		woocommerce,
		addon_feature,
	},
	data: () => ( {
		translations: bookit_window.translations,
	} ),
	props: {
		proAddons: {
			type: Array,
			required: false,
		},
		settings_object: {
			type: Object,
			required: true
		},
		gateways: {
			type: Object,
			required: true
		},
		pro_installed: {
			type: Boolean,
			required: true
		},
		pro_disabled: {
			type: Boolean,
			required: true
		},
		woocommerce_products: {
			type: Array,
			required: false,
			default: []
		},
		woocommerce_enabled: {
			type: Boolean,
			required: true,
		}
	},
	computed: {
		errors() {
			return this.$store.getters.getErrors;
		},
		isPaymentsReady() {
			return !!( this.settings_object && this.settings_object.payments );
		},
		paymentAddonRaw() {
			if ( Array.isArray( this.proAddons ) && this.proAddons.length ) {
				return this.proAddons[0];
			}

			return {
				name: '',
				freemius: {},
				data: {
					title: '',
					link: '',
					installed: false,
					isCanUse: false,
					activationLink: '',
					settings: {
						payments: []
					}
				}
			};
		},
		paymentAddon() {
			return this.paymentAddonRaw.data || {};
		},
		addonPayments() {
			if ( !this.paymentAddon.settings || !Array.isArray( this.paymentAddon.settings.payments ) ) {
				return [];
			}

			return this.paymentAddon.settings.payments;
		}
	},
	created() {
		this.ensurePaymentDefaults();
	},
	watch: {
		settings_object: {
			deep: true,
			immediate: true,
			handler() {
				this.ensurePaymentDefaults();
			}
		}
	},
	methods: {
		ensurePaymentDefaults() {
			if ( !this.settings_object || !this.settings_object.payments ) {
				return;
			}

			if ( !this.settings_object.payments.stripeConnect ) {
				this.$set( this.settings_object.payments, 'stripeConnect', {
					enabled: false,
					publish_key: '',
					secret_key: ''
				} );
			}

			if ( !this.settings_object.payments.razorpay ) {
				this.$set( this.settings_object.payments, 'razorpay', {
					enabled: false,
					key_id: '',
					key_secret: ''
				} );
			}
		},
		showActivationLink() {
			return ( this.paymentAddon.installed && !this.paymentAddon.isCanUse );
		},
		showNotInstalledAddon() {
			return !this.paymentAddon.installed && !this.pro_installed;
		},
		hasStripeConnect( payments ) {
			return payments.some( payment => payment.name === 'stripeConnect' );
		},
		hasPayPalLegacy( payments ) {
			return payments.some( payment => payment.name === 'paypal' );
		},
		findPayment( paymentName ) {
			return this.addonPayments.find( payment => payment.name === paymentName );
		},
	},
}
