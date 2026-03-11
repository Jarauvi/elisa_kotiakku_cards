import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

const TRANSLATIONS = {
  fi: {
    cards: {
      elisa_kotiakku_diagnostics: {
        battery_cycle_count: "sykliä",
        charging: "Lataa",
        discharging: "Purkaa",
        idle: "Odottaa"
      }
    },
    editors: {
      elisa_kotiakku_diagnostics: {
        "device": "Valitse Kotiakku laite",
        "temperature_low_threshold": "Akun lämpötilan alarajavaroitus (°C)",
        "temperature_low_threshold_desc": "Näyttää varoitusikonin, jos lämpötilan alaraja saavutetaan",
        "temperature_high_threshold": "Akun lämpötilan ylärajavaroitus (°C)",
        "temperature_high_threshold_desc": "Näyttää varoitusikonin, jos lämpötilan yläraja saavutetaan"
      }
    }
  },
  en: {
    cards: {
      elisa_kotiakku_diagnostics: {
        battery_cycle_count: "cycles",
        battery_charging: "Charging",
        battery_discharging: "Discharging"
      }
    },
    editors: {
      elisa_kotiakku_diagnostics: {
        "device": "Select your Kotiakku Device",
        "temperature_low_threshold": "Battery Temperature Low Warning (°C)",
        "temperature_low_threshold_desc": "Show warning icon if battery temperature falls below this value",
        "temperature_high_threshold": "Battery Temperature High Warning (°C)",
        "temperature_high_threshold_desc": "Show warning icon if battery temperature rises above this value"
      }
    }
  }
};

class ElisaKotiakkuDiagnostics extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  setConfig(config) {
    this.config = {
      device_slug: "kotiakku",
      battery_temp_low_threshold: 15,
      battery_temp_high_threshold: 30,
      ...config,
    };
  }

static get styles() {
    return css`
      :host {
        display: block;
      }
      ha-card {
        padding: 16px;
        background: var(--ha-card-background, var(--card-background-color, white));
        border-radius: var(--ha-card-border-radius, 12px);
      }
      .container {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      svg {
        width: 100%;
        max-width: 320px;
        height: auto;
      }
      /* Notice the tiny font sizes because your viewBox is very small */
      text {
        font-family: -apple-system, Roboto, sans-serif;
        text-anchor: middle;
        dominant-baseline: middle;
      }
      .val-text { font-size: 1.5; font-weight: bold; }
      .state-text { font-size: 1.2; fill: #4caf50; }
      .small-text { font-size: 0.8; fill: var(--secondary-text-color); }
      .left-text {
        text-anchor: start;
      }

      .center-text {
        text-anchor: middle;
      }

      .right-text {
        text-anchor: end;
      }
      .card-text {
        color: var(--primary-text-color, #000); /* black in light mode, white in dark mode */
      }
      @keyframes discharge {
        to {
          stroke-dashoffset: -20;
        }
      }
      @keyframes charge {
        to {
          stroke-dashoffset: 20;
        }
      }
    `;
  }

  static getConfigElement() {
    return document.createElement("elisa-kotiakku-diagnostics-editor");
  }

  static getStubConfig() {
    return { device_slug: "kotiakku" };
  }

  _getSensorValue(key, { asInteger = false } = {}) {
    if (!this.hass || !this.config.device_slug) return null;

    const entityId = `sensor.${this.config.device_slug}_${key}`;
    const stateObj = this.hass.states[entityId];

    if (!stateObj) return null;

    const rawValue = stateObj.state?.toString() || "";

    // Check if the entire value is a pure number
    const numericValue = Number(rawValue);
    const isNumeric = !isNaN(numericValue) && rawValue.trim().match(/^[-+]?\d*\.?\d+$/);

    if (isNumeric) {
      let value = asInteger ? Math.round(numericValue) : numericValue;
      const unit = stateObj.attributes?.unit_of_measurement || "";
      return `${value}${unit ? " " + unit : ""}`;
    }

    // Otherwise, leave mixed strings untouched
    return rawValue;
  }

  _getRawValue(key) {
    if (!this.hass || !this.config.device_slug) return null;

    const entityId = `sensor.${this.config.device_slug}_${key}`;
    const stateObj = this.hass.states[entityId];

    if (!stateObj) return -1;

    return stateObj.state?.toString() || 0;
  }

  render() {
    const lang = this.hass?.language || "en";

    // Values
    const state_of_charge_percent = this._getSensorValue("state_of_charge_percent", { asInteger: true });
    const bs = this._getSensorValue("battery_state");
    const battery_state = TRANSLATIONS?.[lang]?.["cards"]?.["elisa_kotiakku_diagnostics"]?.[bs] || bs;
    const battery_power_kw = this._getSensorValue("battery_power_kw");
    const battery_loss_kw = this._getSensorValue("battery_loss_kw");
    const battery_temperature_celsius = this._getSensorValue("battery_temperature_celsius");
    const battery_efficiency_ratio = this._getSensorValue("battery_efficiency_ratio");
    const battery_cycle_count = this._getSensorValue("battery_cycle_count");
    const time_to_90_percent = this._getSensorValue("time_to_90_percent");
    const time_to_15_percent = this._getSensorValue("time_to_15_percent");
    const solar_to_battery_kw = this._getSensorValue("solar_to_battery_kw");
    const grid_to_battery_kw = this._getSensorValue("grid_to_battery_kw");
    const battery_to_house_kw = this._getSensorValue("battery_to_house_kw");
    const battery_to_grid_kw = this._getSensorValue("battery_to_grid_kw");

    // Charging state
    const normalized = battery_state?.toString().toLowerCase();
    const charging_state = (normalized === "charging" || normalized === "lataa") ? "inline" : "none";
    const discharging_state = (normalized === "discharging" || normalized === "purkaa") ? "inline" : "none";
    let charging_animation = "none";
    if (charging_state === "inline") {
      charging_animation = "charge 2s linear infinite";
    }
    else if (discharging_state === "inline") {
      charging_animation = "discharge 2s linear infinite";
    }

    const idle_state = (normalized === "idle" || normalized === "odottaa") ? "none" : "inline";

    // Bar logic
    const maxHeight = 82.335;
    const fillHeight = (parseFloat(state_of_charge_percent) / 100) * maxHeight;
    const yOffset = 109.91 + (maxHeight - fillHeight);

    // Temperature warning icons
    const low_temp_threshold = Number(this.config?.battery_temp_low_threshold ?? 15);
    const high_temp_threshold = Number(this.config?.battery_temp_high_threshold ?? 30);
    const temp = this._getRawValue("battery_temperature_celsius")
    let nominal_temp = "inline";
    let low_temp = "none";
    let high_temp = "none";
    if (temp < low_temp_threshold) {
      nominal_temp = "none";
      low_temp = "inline";
    } else if (temp > high_temp_threshold) {
      nominal_temp = "none";
      high_temp = "inline";
    }

    return html`
      <ha-card>
        <div class="container">
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="78.48" height="69.2" version="1.1" viewBox="0 0 96.656 112.24" xml:space="preserve">
            <defs>
              <linearGradient id="linearGradient32" x1="94.728" x2="94.728" y1="85.596" y2="84.488" gradientTransform="matrix(6.1178 0 0 6.1178 -436.57 -407.75)" gradientUnits="userSpaceOnUse">
                <stop stop-color="#cecece" offset="0"/>
                <stop stop-color="#e7e7e7" stop-opacity="0" offset="1"/>
              </linearGradient>
              <linearGradient id="linearGradient34" x1="85.574" x2="85.574" y1="90.628" y2="107.04" gradientTransform="matrix(6.1178 0 0 6.1178 -430.88 -462.32)" gradientUnits="userSpaceOnUse">
                <stop stop-color="#acd2ff" offset="0"/>
                <stop stop-color="#002653" offset="1"/>
              </linearGradient>
              <linearGradient id="linearGradient82" x1="90.336" x2="206.13" y1="103.54" y2="103.54" gradientTransform="translate(5.6553)" gradientUnits="userSpaceOnUse">
                <stop stop-color="#6fccff" offset="0"/>
                <stop offset=".93511"/>
                <stop stop-color="#002234" stop-opacity="0" offset="1"/>
              </linearGradient>
            </defs>
            <g transform="translate(-102.84 -97.165)">
              <g id="battery_charging" transform="matrix(4.4677 0 0 4.4677 -270.19 -301.04)" display="${charging_state}">
                <text id="time_to_90_percent" x="103.89305" y="94.402504" fill="#ffffff" font-size=".88194px" stroke-linecap="round" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${time_to_90_percent}</text>
                <g transform="translate(-1.8769 9.2527)" fill="none" stroke="#fff">
                  <g stroke-width=".18344">
                    <path d="m102.28 87.393h1.1961c0.0469 4e-3 0.078 0.03513 0.0933 0.0933l0.16028 0.84924c0.0135 0.06122-0.0136 0.09311-0.0813 0.09569h-1.5502c-0.059-0.01116-0.0861-0.04465-0.0813-0.10047l0.18181-0.86598c6e-3 -0.04147 0.0335-0.06539 0.0813-0.07177z"/>
                    <path d="m102.54 87.393-0.11502 1.0612"/>
                    <path d="m102.88 87.393-5e-3 1.0382"/>
                    <path d="m103.21 87.393 0.12179 1.0384"/>
                    <path d="m102.11 87.898h1.5393"/>
                  </g>
                  <g stroke-width=".091719">
                    <circle cx="103.36" cy="86.938" r=".15191"/>
                    <path d="m103.36 86.625v0.07781"/>
                    <path d="m103.54 86.763 0.0442-0.0442"/>
                    <path d="m103.6 86.937h0.0884"/>
                    <path d="m103.52 87.112 0.063 0.06302"/>
                    <path d="m103.36 87.182v0.08796"/>
                    <path d="m103.19 87.112-0.0536 0.05354"/>
                    <path d="m103.12 86.937h-0.0847"/>
                    <path d="m103.19 86.763-0.0623-0.06229"/>
                  </g>
                </g>
                <g transform="translate(-3.4186 12.744)" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
                  <g stroke-width=".11905">
                    <path d="m103.87 87.66h1.1388"/>
                    <path d="m104.81 87.66-0.19028-0.70844-0.10246-0.81969-0.0966-0.202-0.10246 0.21956-0.079 0.81676-0.16979 0.69381"/>
                    <path d="m104.7 87.251-0.63078 0.40908"/>
                    <path d="m104.81 87.66-0.64054-0.40908"/>
                    <path d="m104.7 87.251h-0.53067"/>
                    <path d="m104.54 86.298h-0.23429"/>
                    <path d="m104.52 86.132h-0.19087"/>
                    <path d="m104.27 86.729-0.42613 0.178h1.1402l-0.41711-0.178z"/>
                    <path d="m104.3 86.298h-0.35152l0.37413-0.16646"/>
                    <path d="m104.54 86.298h0.36854l-0.38935-0.16646"/>
                  </g>
                  <g stroke-width=".05">
                    <path d="m104.91 86.298 0.31803 0.25262"/>
                    <path d="m104.93 86.887 0.31803 0.25262"/>
                    <path d="m103.93 86.323-0.31803 0.25262"/>
                    <path d="m103.9 86.912-0.31803 0.25262"/>
                  </g>
                </g>
                <text id="solar_to_battery_kw" x="105.10344" y="97.078957" fill="#ffffff" font-size="1.0583px" stroke-linecap="round" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${solar_to_battery_kw}</text>
                <text id="grid_to_battery_kw" x="105.10343" y="99.405746" fill="#ffffff" font-size="1.0583px" stroke-linecap="round" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${grid_to_battery_kw}</text>
              </g>
              <g id="battery_discharging" transform="matrix(4.4677 0 0 4.4677 -317.47 -301.04)" display="${discharging_state}" stroke-linecap="round">
                <text id="time_to_15_percent" x="114.47638" y="94.402504" fill="#ffffff" font-size=".88194px" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${time_to_15_percent}</text>
                <g transform="translate(9.9386 8.7752)" stroke="#fff" stroke-linejoin="round" stroke-width=".1">
                  <path d="m100.86 88.943h1.5701" fill="#2c0"/>
                  <g fill="none">
                    <path d="m101.02 88.943v-1.0552l-0.14385 0.11066-0.0664-0.11434 0.82888-0.60861 0.83097 0.61968-0.0664 0.10328-0.15123-0.11066v1.0552"/>
                    <path d="m101.02 87.888 0.61967-0.46476 0.6123 0.46476"/>
                    <path d="m101.56 88.943v-0.55033h-0.34689v0.55033"/>
                    <rect x="101.47" y="87.798" width=".32863" height=".32602"/>
                    <rect x="101.75" y="88.39" width=".32602" height=".3182"/>
                    <path d="m101.45 88.632v0.07564"/>
                    <path d="m101.91 88.39v0.3182"/>
                    <path d="m101.64 87.798v0.32603"/>
                    <path d="m101.98 87.525v-0.16277h0.18109v0.29782"/>
                  </g>
                </g>
                <g transform="translate(7.1647 12.744)" fill="none" stroke="#fff" stroke-linejoin="round">
                  <g stroke-width=".11905">
                    <path d="m103.87 87.66h1.1388"/>
                    <path d="m104.81 87.66-0.19028-0.70844-0.10246-0.81969-0.0966-0.202-0.10246 0.21956-0.079 0.81676-0.16979 0.69381"/>
                    <path d="m104.7 87.251-0.63078 0.40908"/>
                    <path d="m104.81 87.66-0.64054-0.40908"/>
                    <path d="m104.7 87.251h-0.53067"/>
                    <path d="m104.54 86.298h-0.23429"/>
                    <path d="m104.52 86.132h-0.19087"/>
                    <path d="m104.27 86.729-0.42613 0.178h1.1402l-0.41711-0.178z"/>
                    <path d="m104.3 86.298h-0.35152l0.37413-0.16646"/>
                    <path d="m104.54 86.298h0.36854l-0.38935-0.16646"/>
                  </g>
                  <g stroke-width=".05">
                    <path d="m104.91 86.298 0.31803 0.25262"/>
                    <path d="m104.93 86.887 0.31803 0.25262"/>
                    <path d="m103.93 86.323-0.31803 0.25262"/>
                    <path d="m103.9 86.912-0.31803 0.25262"/>
                  </g>
                </g>
                <text id="battery_to_house_kw" x="115.68677" y="97.078957" fill="#ffffff" font-size="1.0583px" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${battery_to_house_kw}</text>
                <text id="battery_to_grid_kw" x="115.68677" y="99.405746" fill="#ffffff" font-size="1.0583px" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${battery_to_grid_kw}</text>
              </g>
              <g>
                <path d="m110.59 204.14v2.6304c5.3e-4 1.2831 1.0406 2.3231 2.3237 2.3237 0.0208 3.1e-4 0.0422 3.1e-4 0.0633 0h57.829c1.2831-5.5e-4 2.3232-1.0406 2.3236-2.3237-5.5e-4 -0.0753-5e-3 -0.14988-0.0122-0.22452l2.5e-4 -2.4059z" fill="#cecece" stroke="#000" stroke-width=".61178"/>
                <path d="m110.59 115.91h62.528l-1.3e-4 88.238-62.527 6e-5z" fill="#cecece"/>
                <path d="m173.11 115.91 6e-5 -5.9936h-62.528v5.9936z" fill="url(#linearGradient32)"/>
              </g>
              <path d="m110.59 204.14 1e-5 -94.231h62.528v94.324" fill="none" stroke="#000" stroke-width=".61178"/>
              <path d="m135.55 116.21a3.0178 3.0178 0 0 0-3.016 3.016 3.0178 3.0178 0 0 0 3.016 3.0192 3.0178 3.0178 0 0 0 6e-3 0h12.74a3.0178 3.0178 0 0 0 3.016-3.0192 3.0178 3.0178 0 0 0-3.016-3.016z" fill="#e7e7e7" stroke="#000" stroke-width=".61178"/>
              <g fill="none" stroke="#000">
                <circle cx="148.1" cy="119.23" r=".74223" stroke-width=".30589"/>
                <circle cx="135.58" cy="119.23" r=".74223" stroke-width=".30589"/>
                <path d="m173.11 126.85h-62.528" stroke-width=".30589"/>
                <path d="m173.11 165.45h-62.528" stroke-width=".30589"/>
              </g>
              <g transform="matrix(.54572 0 0 .54572 81.359 74.891)">
                <path d="m110.31 81.704-1.6246 0.06011 0.19681 0.26397 0.14828 0.12049 0.41313 0.09053 0.3235-0.14638z"/>
                <path d="m111.36 81.708 0.6075 0.42172 0.29225 0.11976 0.2829-0.04508 0.37707-0.33187 0.0703-0.11298z"/>
                <path d="m111.33 81.55 2.0841-1.2146 0.0333 0.47616-0.26064 0.4926-0.36501 0.22638-0.96306 0.05242z"/>
                <path d="m111.2 81.362 1.0371-0.53567 0.53713-0.38775 0.3075-0.50591-0.0595-0.41889-0.3621-0.51529-0.5192 0.70418z"/>
                <path d="m110.98 81.25 0.66585-1.0275 0.34498-0.79356 6e-3 -0.62198-0.27261-0.34554-0.49772-0.16045-0.1895 0.47776-0.1164 0.85746-5e-3 0.75837z"/>
                <path d="m110.7 81.217 0.0571-0.893-0.0175-0.85022-0.1111-0.7269-0.1876-0.44576-0.31176 0.06799-0.37472 0.28712-0.119 0.55049 0.1365 0.48355 0.66066 1.2124z"/>
                <path d="m110.47 81.355-0.68983-1.2668-0.77203-1.0906-0.2264 0.27189-0.1967 0.4966 0.0626 0.35918 0.11597 0.18161z"/>
                <path d="m110.34 81.579-2.0487-1.2242-0.0808 0.27515 0.1281 0.48224 0.34913 0.34539 0.30682 0.11099z"/>
              </g>
              <rect id="battery_gauge_bg" x="92.95" y="109.91" width="8.5356" height="82.335" stroke="#000" stroke-width=".61178"/>
              <path id="charging_animation" display="${idle_state}" style="animation:${charging_animation}" d="m97.217 109.91v-6.2126l5.7314-5.3103h108.84" fill="none" stroke="url(#linearGradient82)" stroke-dasharray="1.22605, 1.22605" stroke-linejoin="round" stroke-width="2.4521"/>
              <rect id="battery_gauge" x="92.95" y="${yOffset}" width="8.5357" height="${fillHeight}" fill="url(#linearGradient34)" stroke="#000" stroke-width=".61178"/>
              <text id="state_of_charge_percent" x="98.032837" y="200.68573" fill="#ffffff" font-size="6.4746px" stroke-width=".16857" text-align="center" text-anchor="middle" xml:space="preserve">${state_of_charge_percent}</text>
              <g transform="matrix(6.1178 0 0 6.1178 -501.18 -388.83)">
                <rect x="100.34" y="94.045" width="9.5298" height="2.3289" fill="#979797"/>
                <g fill="none" stroke-linecap="round" stroke-width=".05">
                  <path d="m102.67 94.045v2.3289" stroke="#868686"/>
                  <path d="m100.34 96.374h9.5298" stroke="#6a6a6a"/>
                  <path d="m100.34 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m109.87 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m100.34 94.045h9.5298" stroke="#d9d9d9"/>
                </g>
              </g>
              <g id="battery_temperature_low" display="${low_temp}" transform="matrix(5.0722 0 0 5.0722 -473.9 -257.64)">
                <path d="m116.87 87.942c-0.12072 1.6e-5 -0.21858 0.09788-0.21859 0.21859v1.1741c-0.0863 0.07084-0.13671 0.17957-0.13671 0.29472 0 0.20647 0.15908 0.37384 0.3553 0.37381 0.19622 3.3e-5 0.35531-0.16734 0.35531-0.37381 0-0.10703-0.0436-0.20893-0.11978-0.27988l-0.0169-1.189c-1e-5 -0.12072-0.0979-0.21858-0.2186-0.21859z" fill="none" stroke="#000" stroke-width=".178"/>
                <g>
                  <path d="m116.87 89.238c-0.0187-4.7e-5 -0.0339 0.01514-0.0339 0.03387v0.19854c-0.076 0.016-0.13046 0.0831-0.13042 0.1608-3e-5 0.09075 0.0735 0.16432 0.16429 0.1643 0.0907 2.9e-5 0.16433-0.07354 0.1643-0.1643 4e-5 -0.0777-0.0544-0.1448-0.13042-0.1608v-0.19853c3e-5 -0.01873-0.0152-0.03392-0.0339-0.03387z" fill="#0088d4" stroke="#0088d4" stroke-width=".033786"/>
                  <g stroke="#000">
                    <path d="m117.76 88.002c-0.0395-1.5e-5 -0.0471 0.02718-0.0714 0.07148l-0.28085 0.48035c-0.0236 0.03474-0.0461 0.07934-0.0461 0.10418-2e-5 0.03949 0.032 0.07149 0.0715 0.07148h3.3e-4 0.65478c0.0395-8.2e-5 0.0713-0.03206 0.0713-0.07148 1e-5 -0.02493-0.0177-0.0526-0.0331-0.0827l-0.29494-0.50183c-0.0233-0.03608-0.032-0.07149-0.0715-0.07148z" fill="#fbe500" stroke-width=".086807"/>
                    <ellipse cx="117.76" cy="88.56" rx=".030768" ry=".028638" stroke-width=".033655"/>
                    <path d="m117.76 88.243a0.030768 0.028638 0 0 0-0.0308 0.0287 0.030768 0.028638 0 0 1 0 1.74e-4v0.15566a0.030768 0.028638 0 0 1 0 1.73e-4 0.030768 0.028638 0 0 0 0.0308 0.0287 0.030768 0.028638 0 0 0 0.0308-0.0287v-0.156a0.030768 0.028638 0 0 0-0.0308-0.0287z" stroke-width=".033655"/>
                  </g>
                </g>
              </g>
              <g transform="matrix(6.1178 0 0 6.1178 -501.19 -427.2)">
                <rect x="100.34" y="94.045" width="9.5298" height="2.3289" fill="#979797"/>
                <g fill="none" stroke-linecap="round" stroke-width=".05">
                  <path d="m102.67 94.045v2.3289" stroke="#868686"/>
                  <path d="m100.34 96.374h9.5298" stroke="#6a6a6a"/>
                  <path d="m100.34 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m109.87 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m100.34 94.045h9.5298" stroke="#d9d9d9"/>
                </g>
              </g>
              <g id="battery_round_trip_efficiency" transform="matrix(5.445 0 0 5.445 -463.97 -308.18)">
                <path d="m106.92 85.788c-0.28154-0.07428-0.45286-0.28274-0.51396-0.62539-0.018-0.3103 0.14616-0.54392 0.4924-0.70086l4e-3 0.14017 0.29472-0.26956-0.30191-0.248v0.12939c-0.39573 0.1479-0.63414 0.41027-0.71523 0.78713-0.0408 0.3055 0.0384 0.5583 0.23721 0.75837 0.13897 0.1258 0.28753 0.21326 0.44567 0.26238z"/>
                <path d="m107.44 84.452c0.28154 0.07428 0.45286 0.28274 0.51396 0.62539 0.018 0.3103-0.14616 0.54392-0.4924 0.70086l-4e-3 -0.14017-0.29472 0.26956 0.30191 0.248v-0.12939c0.39573-0.1479 0.63414-0.41027 0.71523-0.78713 0.0408-0.3055-0.0384-0.5583-0.23721-0.75837-0.13897-0.1258-0.28753-0.21326-0.44567-0.26238z"/>
                <ellipse cx="107.36" cy="85.286" rx=".072791" ry=".11778" fill="none" stroke="#000" stroke-width=".076554"/>
                <ellipse cx="107.05" cy="84.966" rx=".072791" ry=".11778" fill="none" stroke="#000" stroke-width=".076554"/>
                <path d="m107.36 84.818-0.41981 0.62422h0.10666l0.41434-0.62422z"/>
              </g>
              <g transform="matrix(6.1178 0 0 6.1178 -501.19 -406.73)">
                <rect x="100.34" y="94.045" width="9.5298" height="2.3289" fill="#979797"/>
                <g fill="none" stroke-linecap="round" stroke-width=".05">
                  <path d="m102.67 94.045v2.3289" stroke="#868686"/>
                  <path d="m100.34 96.374h9.5298" stroke="#6a6a6a"/>
                  <path d="m100.34 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m109.87 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m100.34 94.045h9.5298" stroke="#d9d9d9"/>
                </g>
              </g>
              <g id="battery_cycles" transform="matrix(5.2442 0 0 5.2442 -418.42 -295.81)" stroke="#000">
                <path d="m102.66 89.757 0.12399 0.02701-0.0374 0.12886-0.0354-0.05416c-0.0873 0.05702-0.13585 0.15102-0.14566 0.28199-9.7e-4 0.11616 0.0458 0.20766 0.14006 0.27452 0.0837 0.06673 0.18335 0.08416 0.29879 0.05229 0.11292-0.03379 0.18886-0.11161 0.22783-0.23343 0.0331-0.09898 0.015-0.19795-0.0541-0.29693l-0.0374 0.04482v-0.13633l0.13632 0.02614-0.0486 0.02988c0.0671 0.10374 0.0868 0.19076 0.0747 0.30066-0.0122 0.09999-0.0595 0.18589-0.14562 0.25771-0.0941 0.06147-0.18996 0.08948-0.28759 0.08404-0.12476-0.01677-0.22312-0.07404-0.29506-0.17181-0.0459-0.0474-0.0729-0.16149-0.0638-0.28878 0.0126-0.08702 0.0406-0.13046 0.0768-0.18183 0.0213-0.03351 0.055-0.06525 0.10094-0.09524z" stroke-width=".10506"/>
                <path d="m102.75 89.618v-0.30726c-5e-3 -0.06403-0.0427-0.10128-0.11174-0.11174h-0.12179v-0.1017c-2e-3 -0.04018-0.0234-0.06194-0.0653-0.06529h-0.26367c-0.0469-0.0017-0.0737 0.02511-0.0803 0.08035v0.08538h-0.13057c-0.0544 0.0159-0.0837 0.0452-0.0879 0.08789v1.4815c5e-3 0.05566 0.0394 0.08956 0.1017 0.1017h0.66167c0.0592-0.0056 0.0933-0.03976 0.10232-0.10233v-0.10735" fill="none" stroke-width=".178"/>
                <path d="m102.42 90.564h-0.24959c-0.0199 0.0023-0.0299 0.01236-0.0301 0.03007v0.06878c2e-3 0.0171 0.01 0.0254 0.0249 0.02492h0.32146c0.0228 0.0024 0.0325-0.0072 0.0289-0.02893v-0.02317c-0.0352-0.0173-0.0671-0.04119-0.0957-0.07166z" fill="none" stroke-width=".13356"/>
              </g>
              <g transform="matrix(6.1178 0 0 6.1178 -501.31 -445.16)">
                <rect x="100.34" y="94.045" width="9.5298" height="2.3289" fill="#979797"/>
                <g fill="none" stroke-linecap="round" stroke-width=".05">
                  <path d="m102.67 94.045v2.3289" stroke="#868686"/>
                  <path d="m100.34 96.374h9.5298" stroke="#6a6a6a"/>
                  <path d="m100.34 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m109.87 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m100.34 94.045h9.5298" stroke="#d9d9d9"/>
                </g>
              </g>
              <g id="battery_loss_power" transform="matrix(4.0947 0 0 4.0947 -301.15 -210.31)" stroke="#000">
                <g>
                  <path d="m103.08 84.404v-0.42806c-5e-3 -0.06403-0.0427-0.10128-0.11174-0.11174h-0.12179v-0.1017c-2e-3 -0.04018-0.0234-0.06194-0.0653-0.06529h-0.26367c-0.0469-0.0017-0.0737 0.02511-0.0803 0.08036v0.08538h-0.13058c-0.0544 0.0159-0.0837 0.0452-0.0879 0.08789v0.45819m0 0.6836v0.33976c5e-3 0.05566 0.0394 0.08956 0.1017 0.1017h0.66167c0.0592-0.0056 0.0933-0.03976 0.10233-0.10233v-0.3474" fill="none" stroke-width=".17807"/>
                  <path d="m102.2 85.798c-0.23286-0.02126-0.39618-0.16344-0.49027-0.42654-0.0104-0.24324 0-0.37511 0.36291-0.56241l0.0513 0.10015 0.11496-0.29925-0.30578-0.06989 0.0464 0.09293c-0.35701 0.17605-0.45848 0.33178-0.4724 0.64093 8e-3 0.24729 0.10483 0.43686 0.28884 0.56874 0.12672 0.08108 0.25605 0.13048 0.3878 0.14826z" stroke-width=".072492"/>
                  <path d="m103.11 84.808c0.23286 0.02126 0.39618 0.16344 0.49027 0.42654 0.0104 0.24324 0 0.37511-0.36291 0.56241l-0.0513-0.10015-0.11496 0.29925 0.30578 0.06989-0.0464-0.09293c0.35701-0.17605 0.45848-0.33178 0.4724-0.64093-8e-3 -0.24729-0.10483-0.43686-0.28884-0.56874-0.12672-0.08108-0.25605-0.13048-0.3878-0.14826z" stroke-width=".072492"/>
                </g>
                <g fill="none" stroke-linecap="round" stroke-width=".085263">
                  <path d="m102.83 84.394c-0.0335 0.03949-0.0516 0.08255-0.0544 0.12915-1e-5 0.04273 8e-3 0.08308 0.0249 0.12106 0.0534 0.04926 0.0851 0.13975 0.0935 0.19851-4e-3 0.07152-0.0278 0.12878-0.0721 0.1718"/>
                  <path d="m102.66 84.391c-0.0335 0.03949-0.0516 0.08255-0.0544 0.12915-1e-5 0.04273 8e-3 0.08308 0.0249 0.12106 0.0534 0.04926 0.0851 0.13975 0.0935 0.19851-4e-3 0.07152-0.0278 0.12878-0.0721 0.1718"/>
                  <path d="m102.47 84.391c-0.0335 0.03949-0.0516 0.08255-0.0544 0.12915-1e-5 0.04273 8e-3 0.08308 0.0249 0.12106 0.0534 0.04926 0.0851 0.13975 0.0935 0.19851-4e-3 0.07152-0.0278 0.12878-0.0721 0.1718"/>
                </g>
              </g>
              <g fill="#000000" stroke-linecap="round" stroke-width=".30741" text-anchor="middle">
                <text id="battery_temperature_celsius" x="147.60332" y="194.79651" font-size="6.4878px" text-align="center" xml:space="preserve">${battery_temperature_celsius}</text>
                <text id="battery_efficiency_ratio" x="147.60332" y="155.92154" font-size="7.1366px" text-align="center" xml:space="preserve">${battery_efficiency_ratio}</text>
                <text id="battery_loss_kw" x="147.60332" y="138.41574" font-size="6.4878px" text-align="center" xml:space="preserve">${battery_loss_kw}</text>
                <text id="battery_cycle_count" x="147.60332" y="176.58539" font-size="6.4878px" text-align="center" xml:space="preserve">${battery_cycle_count}</text>
                <text id="battery_state" fill="#ffffff" x="194.61581" y="106.47527" font-size="6.4746px" text-align="center" xml:space="preserve" text-anchor="middle" dominant-baseline="central">${battery_state}</text>
              </g>
              <text id="battery_power_kw" display="${idle_state}" x="194.40726" y="113.44815" fill="#ffffff" font-size="5.4065px" stroke-linecap="round" stroke-width=".30741" text-align="center" text-anchor="middle" xml:space="preserve">${battery_power_kw}</text>
              <g id="battery_temperature_high" display="${high_temp}" transform="matrix(5.0722 0 0 5.0722 -399.31 -279.11)">
                <g stroke="#000">
                  <path d="m103.05 92.236c-0.0395-1.5e-5 -0.0471 0.02718-0.0714 0.07148l-0.28085 0.48035c-0.0236 0.03474-0.0461 0.07934-0.0461 0.10418-2e-5 0.03949 0.032 0.07149 0.0715 0.07148h3.3e-4 0.65478c0.0395-8.2e-5 0.0713-0.03206 0.0713-0.07148 1e-5 -0.02493-0.0177-0.0526-0.0331-0.0827l-0.29494-0.50183c-0.0233-0.03608-0.032-0.07149-0.0715-0.07148z" fill="#fbe500" stroke-width=".086807"/>
                  <ellipse cx="103.05" cy="92.794" rx=".030768" ry=".028638" stroke-width=".033655"/>
                  <path d="m103.05 92.476a0.030768 0.028638 0 0 0-0.0308 0.0287 0.030768 0.028638 0 0 1 0 1.74e-4v0.15566a0.030768 0.028638 0 0 1 0 1.73e-4 0.030768 0.028638 0 0 0 0.0308 0.0287 0.030768 0.028638 0 0 0 0.0308-0.0287v-0.156a0.030768 0.028638 0 0 0-0.0308-0.0287z" stroke-width=".033655"/>
                </g>
                <path d="m102.17 92.175c-0.12072 1.6e-5 -0.21858 0.09788-0.21859 0.21859v1.1741c-0.0863 0.07084-0.13671 0.17957-0.13671 0.29472 0 0.20647 0.15908 0.37384 0.3553 0.37381 0.19622 3.3e-5 0.35531-0.16734 0.35531-0.37381 0-0.10703-0.0436-0.20893-0.11978-0.27988l-0.0169-1.189c-1e-5 -0.12072-0.0979-0.21858-0.2186-0.21859z" fill="none" stroke="#000" stroke-width=".178"/>
                <path d="m102.17 92.365c-0.0187-4.7e-5 -0.0339 0.01514-0.0339 0.03387v1.3044c-0.076 0.016-0.13046 0.0831-0.13042 0.1608-3e-5 0.09075 0.0735 0.16432 0.16429 0.1643 0.0907 2.9e-5 0.16433-0.07354 0.1643-0.1643 4e-5 -0.0777-0.0544-0.1448-0.13042-0.1608v-1.3044c3e-5 -0.01873-0.0152-0.03392-0.0339-0.03387z" fill="#d40000" stroke="#d40000" stroke-width=".033786"/>
              </g>
              <g id="battery_temperature_nominal" display="${nominal_temp}" transform="matrix(5.0722 0 0 5.0722 -423.66 -258.82)" stroke="#000">
                <path d="m106.97 88.173c-0.12072 1.6e-5 -0.21858 0.09788-0.21859 0.21859v1.1741c-0.0863 0.07084-0.13671 0.17957-0.13671 0.29472 0 0.20647 0.15908 0.37384 0.3553 0.37381 0.19622 3.3e-5 0.35531-0.16734 0.35531-0.37381 0-0.10703-0.0436-0.20893-0.11978-0.27988l-0.0169-1.189c-1e-5 -0.12072-0.0979-0.21858-0.2186-0.21859z" fill="none" stroke-width=".178"/>
                <path d="m106.97 88.993a0.033816 0.033816 0 0 0-0.0339 0.03387 0.033816 0.033816 0 0 1 0 1.75e-4v0.67481a0.16425 0.16425 0 0 0-0.13042 0.1608 0.16425 0.16425 0 0 0 0.16429 0.1643 0.16425 0.16425 0 0 0 0.1643-0.1643 0.16425 0.16425 0 0 0-0.13042-0.1608v-0.67464a0.033816 0.033816 0 0 0 0-3.38e-4 0.033816 0.033816 0 0 0-0.0339-0.03387z" stroke-width=".033786"/>
              </g>
            </g>
          </svg>

          <!--
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="81.195" height="61.654" version="1.1" viewBox="0 0 100 100" xml:space="preserve">
            <defs>
              <linearGradient id="linearGradient32" x1="94.728" x2="94.728" y1="85.596" y2="84.488" gradientTransform="matrix(6.1178 0 0 6.1178 -442.22 -425.8)" gradientUnits="userSpaceOnUse">
                <stop stop-color="#cecece" offset="0"/>
                <stop stop-color="#e7e7e7" stop-opacity="0" offset="1"/>
              </linearGradient>
              <linearGradient id="linearGradient34" x1="85.574" x2="85.574" y1="90.628" y2="107.04" gradientTransform="matrix(6.1178 0 0 6.1178 -436.54 -463.58)" gradientUnits="userSpaceOnUse">
                <stop stop-color="#acd2ff" offset="0"/>
                <stop stop-color="#002653" offset="1"/>
              </linearGradient>
            </defs>
            <g transform="translate(-86.291 -91.563)">
              <g id="battery_charging" transform="matrix(4.4677 0 0 4.4677 -279.77 -310.09)" display="${charging_state}">
                <text id="time_to_90_percent" x="104.02045" y="92.866908" fill="#ffffff" font-size=".88194px" stroke-linecap="round" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${time_to_90_percent}</text>
                <path id="battery_charging_arrow" d="m103.18 94.455v0.76171h4.5956v1.8009h-4.5956v0.76171l-2.8773-1.6619z" display="inline" fill="#2c0" stop-color="#000000"/>
                <g transform="translate(-1.1508 11.431)" fill="none" stroke="#fff">
                  <g stroke-width=".18344">
                    <path d="m102.28 87.393h1.1961c0.0469 4e-3 0.078 0.03513 0.0933 0.0933l0.16028 0.84924c0.0135 0.06122-0.0136 0.09311-0.0813 0.09569h-1.5502c-0.059-0.01116-0.0861-0.04465-0.0813-0.10047l0.18181-0.86598c6e-3 -0.04147 0.0335-0.06539 0.0813-0.07177z"/>
                    <path d="m102.54 87.393-0.11502 1.0612"/>
                    <path d="m102.88 87.393-5e-3 1.0382"/>
                    <path d="m103.21 87.393 0.12179 1.0384"/>
                    <path d="m102.11 87.898h1.5393"/>
                  </g>
                  <g stroke-width=".091719">
                    <circle cx="103.36" cy="86.938" r=".15191"/>
                    <path d="m103.36 86.625v0.07781"/>
                    <path d="m103.54 86.763 0.0442-0.0442"/>
                    <path d="m103.6 86.937h0.0884"/>
                    <path d="m103.52 87.112 0.063 0.06302"/>
                    <path d="m103.36 87.182v0.08796"/>
                    <path d="m103.19 87.112-0.0536 0.05354"/>
                    <path d="m103.12 86.937h-0.0847"/>
                    <path d="m103.19 86.763-0.0623-0.06229"/>
                  </g>
                </g>
                <g transform="translate(-2.6925 14.922)" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
                  <g stroke-width=".11905">
                    <path d="m103.87 87.66h1.1388"/>
                    <path d="m104.81 87.66-0.19028-0.70844-0.10246-0.81969-0.0966-0.202-0.10246 0.21956-0.079 0.81676-0.16979 0.69381"/>
                    <path d="m104.7 87.251-0.63078 0.40908"/>
                    <path d="m104.81 87.66-0.64054-0.40908"/>
                    <path d="m104.7 87.251h-0.53067"/>
                    <path d="m104.54 86.298h-0.23429"/>
                    <path d="m104.52 86.132h-0.19087"/>
                    <path d="m104.27 86.729-0.42613 0.178h1.1402l-0.41711-0.178z"/>
                    <path d="m104.3 86.298h-0.35152l0.37413-0.16646"/>
                    <path d="m104.54 86.298h0.36854l-0.38935-0.16646"/>
                  </g>
                  <g stroke-width=".05">
                    <path d="m104.91 86.298 0.31803 0.25262"/>
                    <path d="m104.93 86.887 0.31803 0.25262"/>
                    <path d="m103.93 86.323-0.31803 0.25262"/>
                    <path d="m103.9 86.912-0.31803 0.25262"/>
                  </g>
                </g>
                <text id="solar_to_battery_kw" x="105.10344" y="99.257202" fill="#ffffff" font-size="1.0583px" stroke-linecap="round" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${solar_to_battery_kw}</text>
                <text id="grid_to_battery_kw" x="105.10343" y="101.58399" fill="#ffffff" font-size="1.0583px" stroke-linecap="round" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${grid_to_battery_kw}</text>
              </g>
              <g id="battery_discharging" transform="matrix(4.4677 0 0 4.4677 -327.05 -310.09)" display="${discharging_state}">
                <text id="time_to_15_percent" x="114.80378" y="93.066908" fill="#ffffff" font-size=".88194px" stroke-linecap="round" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${time_to_15_percent}</text>
                <g transform="translate(9.9386 10.953)" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width=".1">
                  <path d="m101.58 88.943h1.5701" fill="#2c0"/>
                  <g fill="none">
                    <path d="m101.75 88.943v-1.0552l-0.14385 0.11066-0.0664-0.11434 0.82888-0.60861 0.83097 0.61968-0.0664 0.10328-0.15123-0.11066v1.0552"/>
                    <path d="m101.75 87.888 0.61967-0.46476 0.6123 0.46476"/>
                    <path d="m102.29 88.943v-0.55033h-0.34689v0.55033"/>
                    <rect x="102.2" y="87.798" width=".32863" height=".32602"/>
                    <rect x="102.47" y="88.39" width=".32602" height=".3182"/>
                    <path d="m102.18 88.632v0.07564"/>
                    <path d="m102.63 88.39v0.3182"/>
                    <path d="m102.36 87.798v0.32603"/>
                    <path d="m102.7 87.525v-0.16277h0.18109v0.29782"/>
                  </g>
                </g>
                <g transform="translate(7.8908 14.922)" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
                  <g stroke-width=".11905">
                    <path d="m103.87 87.66h1.1388"/>
                    <path d="m104.81 87.66-0.19028-0.70844-0.10246-0.81969-0.0966-0.202-0.10246 0.21956-0.079 0.81676-0.16979 0.69381"/>
                    <path d="m104.7 87.251-0.63078 0.40908"/>
                    <path d="m104.81 87.66-0.64054-0.40908"/>
                    <path d="m104.7 87.251h-0.53067"/>
                    <path d="m104.54 86.298h-0.23429"/>
                    <path d="m104.52 86.132h-0.19087"/>
                    <path d="m104.27 86.729-0.42613 0.178h1.1402l-0.41711-0.178z"/>
                    <path d="m104.3 86.298h-0.35152l0.37413-0.16646"/>
                    <path d="m104.54 86.298h0.36854l-0.38935-0.16646"/>
                  </g>
                  <g stroke-width=".05">
                    <path d="m104.91 86.298 0.31803 0.25262"/>
                    <path d="m104.93 86.887 0.31803 0.25262"/>
                    <path d="m103.93 86.323-0.31803 0.25262"/>
                    <path d="m103.9 86.912-0.31803 0.25262"/>
                  </g>
                </g>
                <g>
                  <path id="battery_discharging_arrow" d="m115.48 94.455v0.76171h-4.5956v1.8009h4.5956v0.76172l2.8773-1.6619z" display="inline" fill="#c00" stop-color="#000000"/>
                  <text id="battery_to_house_kw" x="115.68677" y="99.257202" fill="#ffffff" font-size="1.0583px" stroke-linecap="round" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${battery_to_house_kw}</text>
                  <text id="battery_to_grid_kw" x="115.68677" y="101.58399" fill="#ffffff" font-size="1.0583px" stroke-linecap="round" stroke-width=".050248" text-align="center" text-anchor="middle" xml:space="preserve">${battery_to_grid_kw}</text>
                </g>
              </g>
              <g>
                <path d="m104.93 186.1v2.6304c5.3e-4 1.2831 1.0406 2.3231 2.3237 2.3237 0.0208 3.1e-4 0.0422 3.1e-4 0.0633 0h57.829c1.2831-5.5e-4 2.3232-1.0406 2.3236-2.3237-5.5e-4 -0.0753-5e-3 -0.14988-0.0122-0.22452l2.5e-4 -2.4059z" fill="#cecece" stroke="#000" stroke-width=".61178"/>
                <path d="m104.93 97.863h62.528l-1.3e-4 88.238-62.527 6e-5z" fill="#cecece"/>
                <path d="m167.46 97.863 6e-5 -5.9936h-62.528v5.9936z" fill="url(#linearGradient32)"/>
              </g>
              <path d="m104.93 186.1 1e-5 -94.231h62.528v94.324" fill="none" stroke="#000" stroke-width=".61178"/>
              <path d="m129.89 98.169a3.0178 3.0178 0 0 0-3.016 3.016 3.0178 3.0178 0 0 0 3.016 3.0192 3.0178 3.0178 0 0 0 6e-3 0h12.74a3.0178 3.0178 0 0 0 3.016-3.0192 3.0178 3.0178 0 0 0-3.016-3.016z" fill="#e7e7e7" stroke="#000" stroke-width=".61178"/>
              <g fill="none" stroke="#000">
                <circle cx="142.44" cy="101.19" r=".74223" stroke-width=".30589"/>
                <circle cx="129.93" cy="101.19" r=".74223" stroke-width=".30589"/>
                <path d="m167.46 108.81h-62.528" stroke-width=".30589"/>
                <path d="m167.46 147.4h-62.528" stroke-width=".30589"/>
              </g>
              <g transform="matrix(.54572 0 0 .54572 75.704 56.847)">
                <path d="m110.31 81.704-1.6246 0.06011 0.19681 0.26397 0.14828 0.12049 0.41313 0.09053 0.3235-0.14638z"/>
                <path d="m111.36 81.708 0.6075 0.42172 0.29225 0.11976 0.2829-0.04508 0.37707-0.33187 0.0703-0.11298z"/>
                <path d="m111.33 81.55 2.0841-1.2146 0.0333 0.47616-0.26064 0.4926-0.36501 0.22638-0.96306 0.05242z"/>
                <path d="m111.2 81.362 1.0371-0.53567 0.53713-0.38775 0.3075-0.50591-0.0595-0.41889-0.3621-0.51529-0.5192 0.70418z"/>
                <path d="m110.98 81.25 0.66585-1.0275 0.34498-0.79356 6e-3 -0.62198-0.27261-0.34554-0.49772-0.16045-0.1895 0.47776-0.1164 0.85746-5e-3 0.75837z"/>
                <path d="m110.7 81.217 0.0571-0.893-0.0175-0.85022-0.1111-0.7269-0.1876-0.44576-0.31176 0.06799-0.37472 0.28712-0.119 0.55049 0.1365 0.48355 0.66066 1.2124z"/>
                <path d="m110.47 81.355-0.68983-1.2668-0.77203-1.0906-0.2264 0.27189-0.1967 0.4966 0.0626 0.35918 0.11597 0.18161z"/>
                <path d="m110.34 81.579-2.0487-1.2242-0.0808 0.27515 0.1281 0.48224 0.34913 0.34539 0.30682 0.11099z"/>
              </g>
              <g>
                <rect id="battery_gauge_bg" x="87.294" y="108.65" width="8.5356" height="82.335" stroke="#000" stroke-width=".61178"/>
                <rect id="battery_gauge" x="87.294" y="${yOffset}" width="8.5357" height="${fillHeight}" fill="url(#linearGradient34)" stroke="#000" stroke-width=".61178"/>
                <text id="state_of_charge_percent" x="92.377556" y="103.46178" fill="#ffffff" font-size="6.4746px" stroke="#000000" stroke-width=".16857" text-align="center" text-anchor="middle" xml:space="preserve">${state_of_charge_percent}</text>
              </g>
              <g transform="matrix(6.1178 0 0 6.1178 -506.83 -406.87)">
                <rect x="100.34" y="94.045" width="9.5298" height="2.3289" fill="#979797"/>
                <g fill="none" stroke-linecap="round" stroke-width=".05">
                  <path d="m102.67 94.045v2.3289" stroke="#868686"/>
                  <path d="m100.34 96.374h9.5298" stroke="#6a6a6a"/>
                  <path d="m100.34 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m109.87 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m100.34 94.045h9.5298" stroke="#d9d9d9"/>
                </g>
              </g>
              <g id="battery_temperature_low" transform="matrix(5.0722 0 0 5.0722 -479.56 -275.69)" display="${low_temp}">
                <path d="m116.87 87.942c-0.12072 1.6e-5 -0.21858 0.09788-0.21859 0.21859v1.1741c-0.0863 0.07084-0.13671 0.17957-0.13671 0.29472 0 0.20647 0.15908 0.37384 0.3553 0.37381 0.19622 3.3e-5 0.35531-0.16734 0.35531-0.37381 0-0.10703-0.0436-0.20893-0.11978-0.27988l-0.0169-1.189c-1e-5 -0.12072-0.0979-0.21858-0.2186-0.21859z" fill="none" stroke="#000" stroke-width=".178"/>
                <g>
                  <path d="m116.87 89.238c-0.0187-4.7e-5 -0.0339 0.01514-0.0339 0.03387v0.19854c-0.076 0.016-0.13046 0.0831-0.13042 0.1608-3e-5 0.09075 0.0735 0.16432 0.16429 0.1643 0.0907 2.9e-5 0.16433-0.07354 0.1643-0.1643 4e-5 -0.0777-0.0544-0.1448-0.13042-0.1608v-0.19853c3e-5 -0.01873-0.0152-0.03392-0.0339-0.03387z" fill="#0088d4" stroke="#0088d4" stroke-width=".033786"/>
                  <g stroke="#000">
                    <path d="m117.76 88.002c-0.0395-1.5e-5 -0.0471 0.02718-0.0714 0.07148l-0.28085 0.48035c-0.0236 0.03474-0.0461 0.07934-0.0461 0.10418-2e-5 0.03949 0.032 0.07149 0.0715 0.07148h3.3e-4 0.65478c0.0395-8.2e-5 0.0713-0.03206 0.0713-0.07148 1e-5 -0.02493-0.0177-0.0526-0.0331-0.0827l-0.29494-0.50183c-0.0233-0.03608-0.032-0.07149-0.0715-0.07148z" fill="#fbe500" stroke-width=".086807"/>
                    <ellipse cx="117.76" cy="88.56" rx=".030768" ry=".028638" stroke-width=".033655"/>
                    <path d="m117.76 88.243a0.030768 0.028638 0 0 0-0.0308 0.0287 0.030768 0.028638 0 0 1 0 1.74e-4v0.15566a0.030768 0.028638 0 0 1 0 1.73e-4 0.030768 0.028638 0 0 0 0.0308 0.0287 0.030768 0.028638 0 0 0 0.0308-0.0287v-0.156a0.030768 0.028638 0 0 0-0.0308-0.0287z" stroke-width=".033655"/>
                  </g>
                </g>
              </g>
              <g transform="matrix(6.1178 0 0 6.1178 -506.84 -445.25)">
                <rect x="100.34" y="94.045" width="9.5298" height="2.3289" fill="#979797"/>
                <g fill="none" stroke-linecap="round" stroke-width=".05">
                  <path d="m102.67 94.045v2.3289" stroke="#868686"/>
                  <path d="m100.34 96.374h9.5298" stroke="#6a6a6a"/>
                  <path d="m100.34 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m109.87 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m100.34 94.045h9.5298" stroke="#d9d9d9"/>
                </g>
              </g>
              <g id="battery_round_trip_efficiency" transform="matrix(5.445 0 0 5.445 -469.62 -326.22)">
                <path d="m106.92 85.788c-0.28154-0.07428-0.45286-0.28274-0.51396-0.62539-0.018-0.3103 0.14616-0.54392 0.4924-0.70086l4e-3 0.14017 0.29472-0.26956-0.30191-0.248v0.12939c-0.39573 0.1479-0.63414 0.41027-0.71523 0.78713-0.0408 0.3055 0.0384 0.5583 0.23721 0.75837 0.13897 0.1258 0.28753 0.21326 0.44567 0.26238z"/>
                <path d="m107.44 84.452c0.28154 0.07428 0.45286 0.28274 0.51396 0.62539 0.018 0.3103-0.14616 0.54392-0.4924 0.70086l-4e-3 -0.14017-0.29472 0.26956 0.30191 0.248v-0.12939c0.39573-0.1479 0.63414-0.41027 0.71523-0.78713 0.0408-0.3055-0.0384-0.5583-0.23721-0.75837-0.13897-0.1258-0.28753-0.21326-0.44567-0.26238z"/>
                <ellipse cx="107.36" cy="85.286" rx=".072791" ry=".11778" fill="none" stroke="#000" stroke-width=".076554"/>
                <ellipse cx="107.05" cy="84.966" rx=".072791" ry=".11778" fill="none" stroke="#000" stroke-width=".076554"/>
                <path d="m107.36 84.818-0.41981 0.62422h0.10666l0.41434-0.62422z"/>
              </g>
              <g transform="matrix(6.1178 0 0 6.1178 -506.84 -424.78)">
                <rect x="100.34" y="94.045" width="9.5298" height="2.3289" fill="#979797"/>
                <g fill="none" stroke-linecap="round" stroke-width=".05">
                  <path d="m102.67 94.045v2.3289" stroke="#868686"/>
                  <path d="m100.34 96.374h9.5298" stroke="#6a6a6a"/>
                  <path d="m100.34 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m109.87 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m100.34 94.045h9.5298" stroke="#d9d9d9"/>
                </g>
              </g>
              <g id="battery_cycles" transform="matrix(5.2442 0 0 5.2442 -424.07 -313.85)" stroke="#000">
                <path d="m102.66 89.757 0.12399 0.02701-0.0374 0.12886-0.0354-0.05416c-0.0873 0.05702-0.13585 0.15102-0.14566 0.28199-9.7e-4 0.11616 0.0458 0.20766 0.14006 0.27452 0.0837 0.06673 0.18335 0.08416 0.29879 0.05229 0.11292-0.03379 0.18886-0.11161 0.22783-0.23343 0.0331-0.09898 0.015-0.19795-0.0541-0.29693l-0.0374 0.04482v-0.13633l0.13632 0.02614-0.0486 0.02988c0.0671 0.10374 0.0868 0.19076 0.0747 0.30066-0.0122 0.09999-0.0595 0.18589-0.14562 0.25771-0.0941 0.06147-0.18996 0.08948-0.28759 0.08404-0.12476-0.01677-0.22312-0.07404-0.29506-0.17181-0.0459-0.0474-0.0729-0.16149-0.0638-0.28878 0.0126-0.08702 0.0406-0.13046 0.0768-0.18183 0.0213-0.03351 0.055-0.06525 0.10094-0.09524z" stroke-width=".10506"/>
                <path d="m102.75 89.618v-0.30726c-5e-3 -0.06403-0.0427-0.10128-0.11174-0.11174h-0.12179v-0.1017c-2e-3 -0.04018-0.0234-0.06194-0.0653-0.06529h-0.26367c-0.0469-0.0017-0.0737 0.02511-0.0803 0.08035v0.08538h-0.13057c-0.0544 0.0159-0.0837 0.0452-0.0879 0.08789v1.4815c5e-3 0.05566 0.0394 0.08956 0.1017 0.1017h0.66167c0.0592-0.0056 0.0933-0.03976 0.10232-0.10233v-0.10735" fill="none" stroke-width=".178"/>
                <path d="m102.42 90.564h-0.24959c-0.0199 0.0023-0.0299 0.01236-0.0301 0.03007v0.06878c2e-3 0.0171 0.01 0.0254 0.0249 0.02492h0.32146c0.0228 0.0024 0.0325-0.0072 0.0289-0.02893v-0.02317c-0.0352-0.0173-0.0671-0.04119-0.0957-0.07166z" fill="none" stroke-width=".13356"/>
              </g>
              <g transform="matrix(6.1178 0 0 6.1178 -506.97 -463.21)">
                <rect x="100.34" y="94.045" width="9.5298" height="2.3289" fill="#979797"/>
                <g fill="none" stroke-linecap="round" stroke-width=".05">
                  <path d="m102.67 94.045v2.3289" stroke="#868686"/>
                  <path d="m100.34 96.374h9.5298" stroke="#6a6a6a"/>
                  <path d="m100.34 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m109.87 94.045v2.3289" stroke="#8d8d8d"/>
                  <path d="m100.34 94.045h9.5298" stroke="#d9d9d9"/>
                </g>
              </g>
              <g id="battery_loss_power" transform="matrix(4.0947 0 0 4.0947 -306.81 -228.36)" stroke="#000">
                <g>
                  <path d="m103.08 84.404v-0.42806c-5e-3 -0.06403-0.0427-0.10128-0.11174-0.11174h-0.12179v-0.1017c-2e-3 -0.04018-0.0234-0.06194-0.0653-0.06529h-0.26367c-0.0469-0.0017-0.0737 0.02511-0.0803 0.08036v0.08538h-0.13058c-0.0544 0.0159-0.0837 0.0452-0.0879 0.08789v0.45819m0 0.6836v0.33976c5e-3 0.05566 0.0394 0.08956 0.1017 0.1017h0.66167c0.0592-0.0056 0.0933-0.03976 0.10233-0.10233v-0.3474" fill="none" stroke-width=".17807"/>
                  <path d="m102.2 85.798c-0.23286-0.02126-0.39618-0.16344-0.49027-0.42654-0.0104-0.24324 0-0.37511 0.36291-0.56241l0.0513 0.10015 0.11496-0.29925-0.30578-0.06989 0.0464 0.09293c-0.35701 0.17605-0.45848 0.33178-0.4724 0.64093 8e-3 0.24729 0.10483 0.43686 0.28884 0.56874 0.12672 0.08108 0.25605 0.13048 0.3878 0.14826z" stroke-width=".072492"/>
                  <path d="m103.11 84.808c0.23286 0.02126 0.39618 0.16344 0.49027 0.42654 0.0104 0.24324 0 0.37511-0.36291 0.56241l-0.0513-0.10015-0.11496 0.29925 0.30578 0.06989-0.0464-0.09293c0.35701-0.17605 0.45848-0.33178 0.4724-0.64093-8e-3 -0.24729-0.10483-0.43686-0.28884-0.56874-0.12672-0.08108-0.25605-0.13048-0.3878-0.14826z" stroke-width=".072492"/>
                </g>
                <g fill="none" stroke-linecap="round" stroke-width=".085263">
                  <path d="m102.83 84.394c-0.0335 0.03949-0.0516 0.08255-0.0544 0.12915-1e-5 0.04273 8e-3 0.08308 0.0249 0.12106 0.0534 0.04926 0.0851 0.13975 0.0935 0.19851-4e-3 0.07152-0.0278 0.12878-0.0721 0.1718"/>
                  <path d="m102.66 84.391c-0.0335 0.03949-0.0516 0.08255-0.0544 0.12915-1e-5 0.04273 8e-3 0.08308 0.0249 0.12106 0.0534 0.04926 0.0851 0.13975 0.0935 0.19851-4e-3 0.07152-0.0278 0.12878-0.0721 0.1718"/>
                  <path d="m102.47 84.391c-0.0335 0.03949-0.0516 0.08255-0.0544 0.12915-1e-5 0.04273 8e-3 0.08308 0.0249 0.12106 0.0534 0.04926 0.0851 0.13975 0.0935 0.19851-4e-3 0.07152-0.0278 0.12878-0.0721 0.1718"/>
                </g>
              </g>
              <g fill="#000000" stroke-linecap="round" stroke-width=".30741" text-anchor="middle">
                <text id="battery_temperature_celsius" x="141.94804" y="176.75194" font-size="6.4878px" text-align="center" xml:space="preserve">${battery_temperature_celsius}</text>
                <text id="battery_efficiency_ratio" x="141.94804" y="137.87697" font-size="7.1366px" text-align="center" xml:space="preserve">${battery_efficiency_ratio}</text>
                <text id="battery_loss_kw" x="141.94804" y="120.37117" font-size="6.4878px" text-align="center" xml:space="preserve">${battery_loss_kw}</text>
                <text id="battery_cycle_count" x="141.94804" y="158.54082" font-size="6.4878px" text-align="center" xml:space="preserve">${battery_cycle_count}</text>
                <text id="battery_state" fill="#ffffff" x="185.03595" y="97.42482" font-size="6.4746px" text-align="center" xml:space="preserve" text-anchor="middle" dominant-baseline="central">${battery_state}</text>
              </g>
              <text id="battery_power_kw" display="${idle_state}" x="187.12193" y="119.66412" fill="#ffffff" font-size="5.4065px" stroke-linecap="round" stroke-width=".30741" text-align="center" text-anchor="middle" xml:space="preserve">${battery_power_kw}</text>
              <g id="battery_temperature_high" display="${high_temp} transform="matrix(5.0722 0 0 5.0722 -404.96 -297.16)">
                <g stroke="#000">
                  <path d="m103.05 92.236c-0.0395-1.5e-5 -0.0471 0.02718-0.0714 0.07148l-0.28085 0.48035c-0.0236 0.03474-0.0461 0.07934-0.0461 0.10418-2e-5 0.03949 0.032 0.07149 0.0715 0.07148h3.3e-4 0.65478c0.0395-8.2e-5 0.0713-0.03206 0.0713-0.07148 1e-5 -0.02493-0.0177-0.0526-0.0331-0.0827l-0.29494-0.50183c-0.0233-0.03608-0.032-0.07149-0.0715-0.07148z" fill="#fbe500" stroke-width=".086807"/>
                  <ellipse cx="103.05" cy="92.794" rx=".030768" ry=".028638" stroke-width=".033655"/>
                  <path d="m103.05 92.476a0.030768 0.028638 0 0 0-0.0308 0.0287 0.030768 0.028638 0 0 1 0 1.74e-4v0.15566a0.030768 0.028638 0 0 1 0 1.73e-4 0.030768 0.028638 0 0 0 0.0308 0.0287 0.030768 0.028638 0 0 0 0.0308-0.0287v-0.156a0.030768 0.028638 0 0 0-0.0308-0.0287z" stroke-width=".033655"/>
                </g>
                <path d="m102.17 92.175c-0.12072 1.6e-5 -0.21858 0.09788-0.21859 0.21859v1.1741c-0.0863 0.07084-0.13671 0.17957-0.13671 0.29472 0 0.20647 0.15908 0.37384 0.3553 0.37381 0.19622 3.3e-5 0.35531-0.16734 0.35531-0.37381 0-0.10703-0.0436-0.20893-0.11978-0.27988l-0.0169-1.189c-1e-5 -0.12072-0.0979-0.21858-0.2186-0.21859z" fill="none" stroke="#000" stroke-width=".178"/>
                <path d="m102.17 92.365c-0.0187-4.7e-5 -0.0339 0.01514-0.0339 0.03387v1.3044c-0.076 0.016-0.13046 0.0831-0.13042 0.1608-3e-5 0.09075 0.0735 0.16432 0.16429 0.1643 0.0907 2.9e-5 0.16433-0.07354 0.1643-0.1643 4e-5 -0.0777-0.0544-0.1448-0.13042-0.1608v-1.3044c3e-5 -0.01873-0.0152-0.03392-0.0339-0.03387z" fill="#d40000" stroke="#d40000" stroke-width=".033786"/>
              </g>
              <g id="battery_temperature_nominal" display="${nominal_temp} transform="matrix(5.0722 0 0 5.0722 -429.31 -276.86)" stroke="#000">
                <path d="m106.97 88.173c-0.12072 1.6e-5 -0.21858 0.09788-0.21859 0.21859v1.1741c-0.0863 0.07084-0.13671 0.17957-0.13671 0.29472 0 0.20647 0.15908 0.37384 0.3553 0.37381 0.19622 3.3e-5 0.35531-0.16734 0.35531-0.37381 0-0.10703-0.0436-0.20893-0.11978-0.27988l-0.0169-1.189c-1e-5 -0.12072-0.0979-0.21858-0.2186-0.21859z" fill="none" stroke-width=".178"/>
                <path d="m106.97 88.993a0.033816 0.033816 0 0 0-0.0339 0.03387 0.033816 0.033816 0 0 1 0 1.75e-4v0.67481a0.16425 0.16425 0 0 0-0.13042 0.1608 0.16425 0.16425 0 0 0 0.16429 0.1643 0.16425 0.16425 0 0 0 0.1643-0.1643 0.16425 0.16425 0 0 0-0.13042-0.1608v-0.67464a0.033816 0.033816 0 0 0 0-3.38e-4 0.033816 0.033816 0 0 0-0.0339-0.03387z" stroke-width=".033786"/>
              </g>
            </g>
          </svg>
          -->

        </div>
      </ha-card>
    `;
  }

  // To keep render() clean, we can put the static SVG paths here
  renderBaseSVG() {
      return html`
        <path d="m89.921 107.02... " fill="#cecece" stroke="#000" stroke-width=".1"/>
        `;
  }

  setConfig(config) {
    if (!config.device_slug) throw new Error("Define device_slug");
    this.config = config;
  }
}

customElements.define("elisa-kotiakku-diagnostics", ElisaKotiakkuDiagnostics);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "elisa-kotiakku-diagnostics", // Must match your customElements.define name
  name: "Elisa Kotiakku Diagnostics",
  description: "Diagnostics card for Elisa Kotiakku.",
  preview: true,
});

class ElisaKotiakkuDiagnosticsEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  setConfig(config) {
    this._config = config;
  }

  _getTranslation(key) {
    const lang = this.hass?.language || "en";

    return (
      TRANSLATIONS?.[lang]?.editors?.elisa_kotiakku_diagnostics?.[key] ||
      TRANSLATIONS?.en?.editors?.elisa_kotiakku_diagnostics?.[key] ||
      key
    );
  }

  _valueChanged(ev) {
    const newValue = ev.detail.value;
    this._config = { 
      battery_temp_low_threshold: 15,
      battery_temp_high_threshold: 30,
      ...this._config, 
      ...newValue 
    };

  this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config } }));
}

  render() {
    if (!this.hass || !this._config) return html``;

  const schema = [
    {
      name: "device_id",
      label: this._getTranslation("device"),
      selector: {
        device: {
          integration: "elisa_kotiakku"
        }
      },
    },
    {
      name: "battery_temp_low_threshold",
      label: this._getTranslation("temperature_low_threshold"),
      description: this._getTranslation("temperature_low_threshold_desc"),
      selector: { number: { min: 0, max: 20, step: 1 } },
      default: 15,
    },
    {
      name: "battery_temp_high_threshold",
      label: this._getTranslation("temperature_high_threshold"),
      description: this._getTranslation("temperature_high_threshold_desc"),
      selector: { number: { min: 20, max: 40, step: 1 } },
      default: 30,
    },
  ];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${(s) => s.label}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

customElements.define(
  "elisa-kotiakku-diagnostics-editor",
  ElisaKotiakkuDiagnosticsEditor
);