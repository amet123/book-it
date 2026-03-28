export default {
	name: 'razorpay',
	template: `
      <div>
        <div :class="['setting-row no-border pb-10 pt-30', {'not-active': ( !addon.installed || ( addon.installed && ( !addon.isCanUse || !addon.active) ) ) }]">
          <div :class="['form-group small no-margin',{disabled: ( !addon.installed || !addon.isCanUse ) }]">
            <span class="label">{{ this.payment.formatted_name }}</span>
          </div>
          <div :class="['form-group small no-margin', {disabled: ( !addon.installed || !addon.isCanUse ) }]">
            <div class="switcher">
              <div class="bookit-switch">
                <input type="checkbox" v-model="settings_object.payments.razorpay.enabled" :disabled="!addon.installed">
                <label></label>
              </div>
            </div>
            <span class="label for-switcher" v-html=" settings_object.payments.razorpay.enabled ? translations.enabled : translations.disabled"></span>
          </div>
        </div>

        <div v-if="settings_object.payments.razorpay.enabled || ( !addon.installed || !addon.isCanUse ) " :class="['setting-row pt-10', {'not-active': ( !addon.installed || ( addon.installed && ( !addon.isCanUse || !addon.active) ) ) }]">
          <div class="form-group small">
            <label>{{ translations.razorpay_key_id }}</label>
            <input type="text" v-model="settings_object.payments.razorpay.key_id" :disabled="( !addon.installed || !addon.isCanUse )">
          </div>
          <div class="form-group small">
            <label>{{ translations.razorpay_key_secret }}</label>
            <input type="text" v-model="settings_object.payments.razorpay.key_secret" :disabled="( !addon.installed || !addon.isCanUse )">
          </div>
        </div>
      </div>
	`,
	data: () => ({
		translations: bookit_window.translations,
	}),
	props: {
		settings_object: {
			type: Object,
			required: true
		},
		payment: {
			type: Object,
			required: true
		},
		addon: {
			type: Object,
			required: true
		},
	},
}
