/**
 * locations.js
 * ---------------------------------------------------------------------------
 * Self-contained country -> cities dataset. No dependencies, no exports:
 * it simply defines `window.LOCATIONS` and must be loaded before `app.js`.
 *
 * Shape:
 *   window.LOCATIONS = {
 *     "<Country code>": {
 *       "flag":   "<emoji flag>",        // required, shown next to the name
 *       "name": "ascii city name"  // required, order is preserved in the UI
 *     }
 *   }
 *
 * To swap this list out, replace the whole object below. `app.js` reads it
 * generically: countries are Object.keys(), cities come from `.cities`.
 * Country names are used verbatim in the submitted payload.
 * ---------------------------------------------------------------------------
 */
window.LOCATIONS = {
    "AF": {
        flag: "🇦🇫",
        name: "Afghanistan"
    },
    "AX": {
        flag: "🇦🇽",
        name: "Aland Islands"
    },
    "AL": {
        flag: "🇦🇱",
        name: "Albania"
    },
    "DZ": {
        flag: "🇩🇿",
        name: "Algeria"
    },
    "AS": {
        flag: "🇦🇸",
        name: "American Samoa"
    },
    "AD": {
        flag: "🇦🇩",
        name: "Andorra"
    },
    "AO": {
        flag: "🇦🇴",
        name: "Angola"
    },
    "AI": {
        flag: "🇦🇮",
        name: "Anguilla"
    },
    "AQ": {
        flag: "🇦🇶",
        name: "Antarctica"
    },
    "AG": {
        flag: "🇦🇬",
        name: "Antigua and Barbuda"
    },
    "AR": {
        flag: "🇦🇷",
        name: "Argentina"
    },
    "AM": {
        flag: "🇦🇲",
        name: "Armenia"
    },
    "AW": {
        flag: "🇦🇼",
        name: "Aruba"
    },
    "AU": {
        flag: "🇦🇺",
        name: "Australia"
    },
    "AT": {
        flag: "🇦🇹",
        name: "Austria"
    },
    "AZ": {
        flag: "🇦🇿",
        name: "Azerbaijan"
    },
    "BS": {
        flag: "🇧🇸",
        name: "Bahamas"
    },
    "BH": {
        flag: "🇧🇭",
        name: "Bahrain"
    },
    "BD": {
        flag: "🇧🇩",
        name: "Bangladesh"
    },
    "BB": {
        flag: "🇧🇧",
        name: "Barbados"
    },
    "BY": {
        flag: "🇧🇾",
        name: "Belarus"
    },
    "BE": {
        flag: "🇧🇪",
        name: "Belgium"
    },
    "BZ": {
        flag: "🇧🇿",
        name: "Belize"
    },
    "BJ": {
        flag: "🇧🇯",
        name: "Benin"
    },
    "BM": {
        flag: "🇧🇲",
        name: "Bermuda"
    },
    "BT": {
        flag: "🇧🇹",
        name: "Bhutan"
    },
    "BO": {
        flag: "🇧🇴",
        name: "Bolivia"
    },
    "BQ": {
        flag: "🇧🇶",
        name: "Bonaire, Saint Eustatius and Saba "
    },
    "BA": {
        flag: "🇧🇦",
        name: "Bosnia and Herzegovina"
    },
    "BW": {
        flag: "🇧🇼",
        name: "Botswana"
    },
    "BV": {
        flag: "🇧🇻",
        name: "Bouvet Island"
    },
    "BR": {
        flag: "🇧🇷",
        name: "Brazil"
    },
    "IO": {
        flag: "🇮🇴",
        name: "British Indian Ocean Territory"
    },
    "VG": {
        flag: "🇻🇬",
        name: "British Virgin Islands"
    },
    "BN": {
        flag: "🇧🇳",
        name: "Brunei"
    },
    "BG": {
        flag: "🇧🇬",
        name: "Bulgaria"
    },
    "BF": {
        flag: "🇧🇫",
        name: "Burkina Faso"
    },
    "BI": {
        flag: "🇧🇮",
        name: "Burundi"
    },
    "CV": {
        flag: "🇨🇻",
        name: "Cabo Verde"
    },
    "KH": {
        flag: "🇰🇭",
        name: "Cambodia"
    },
    "CM": {
        flag: "🇨🇲",
        name: "Cameroon"
    },
    "CA": {
        flag: "🇨🇦",
        name: "Canada"
    },
    "KY": {
        flag: "🇰🇾",
        name: "Cayman Islands"
    },
    "CF": {
        flag: "🇨🇫",
        name: "Central African Republic"
    },
    "TD": {
        flag: "🇹🇩",
        name: "Chad"
    },
    "CL": {
        flag: "🇨🇱",
        name: "Chile"
    },
    "CN": {
        flag: "🇨🇳",
        name: "China"
    },
    "CX": {
        flag: "🇨🇽",
        name: "Christmas Island"
    },
    "CC": {
        flag: "🇨🇨",
        name: "Cocos Islands"
    },
    "CO": {
        flag: "🇨🇴",
        name: "Colombia"
    },
    "KM": {
        flag: "🇰🇲",
        name: "Comoros"
    },
    "CK": {
        flag: "🇨🇰",
        name: "Cook Islands"
    },
    "CR": {
        flag: "🇨🇷",
        name: "Costa Rica"
    },
    "HR": {
        flag: "🇭🇷",
        name: "Croatia"
    },
    "CU": {
        flag: "🇨🇺",
        name: "Cuba"
    },
    "CW": {
        flag: "🇨🇼",
        name: "Curacao"
    },
    "CY": {
        flag: "🇨🇾",
        name: "Cyprus"
    },
    "CZ": {
        flag: "🇨🇿",
        name: "Czechia"
    },
    "CD": {
        flag: "🇨🇩",
        name: "Democratic Republic of the Congo"
    },
    "DK": {
        flag: "🇩🇰",
        name: "Denmark"
    },
    "DJ": {
        flag: "🇩🇯",
        name: "Djibouti"
    },
    "DM": {
        flag: "🇩🇲",
        name: "Dominica"
    },
    "DO": {
        flag: "🇩🇴",
        name: "Dominican Republic"
    },
    "EC": {
        flag: "🇪🇨",
        name: "Ecuador"
    },
    "EG": {
        flag: "🇪🇬",
        name: "Egypt"
    },
    "SV": {
        flag: "🇸🇻",
        name: "El Salvador"
    },
    "GQ": {
        flag: "🇬🇶",
        name: "Equatorial Guinea"
    },
    "ER": {
        flag: "🇪🇷",
        name: "Eritrea"
    },
    "EE": {
        flag: "🇪🇪",
        name: "Estonia"
    },
    "SZ": {
        flag: "🇸🇿",
        name: "Eswatini"
    },
    "ET": {
        flag: "🇪🇹",
        name: "Ethiopia"
    },
    "FK": {
        flag: "🇫🇰",
        name: "Falkland Islands"
    },
    "FO": {
        flag: "🇫🇴",
        name: "Faroe Islands"
    },
    "FJ": {
        flag: "🇫🇯",
        name: "Fiji"
    },
    "FI": {
        flag: "🇫🇮",
        name: "Finland"
    },
    "FR": {
        flag: "🇫🇷",
        name: "France"
    },
    "GF": {
        flag: "🇬🇫",
        name: "French Guiana"
    },
    "PF": {
        flag: "🇵🇫",
        name: "French Polynesia"
    },
    "TF": {
        flag: "🇹🇫",
        name: "French Southern Territories"
    },
    "GA": {
        flag: "🇬🇦",
        name: "Gabon"
    },
    "GM": {
        flag: "🇬🇲",
        name: "Gambia"
    },
    "GE": {
        flag: "🇬🇪",
        name: "Georgia"
    },
    "DE": {
        flag: "🇩🇪",
        name: "Germany"
    },
    "GH": {
        flag: "🇬🇭",
        name: "Ghana"
    },
    "GI": {
        flag: "🇬🇮",
        name: "Gibraltar"
    },
    "GR": {
        flag: "🇬🇷",
        name: "Greece"
    },
    "GL": {
        flag: "🇬🇱",
        name: "Greenland"
    },
    "GD": {
        flag: "🇬🇩",
        name: "Grenada"
    },
    "GP": {
        flag: "🇬🇵",
        name: "Guadeloupe"
    },
    "GU": {
        flag: "🇬🇺",
        name: "Guam"
    },
    "GT": {
        flag: "🇬🇹",
        name: "Guatemala"
    },
    "GG": {
        flag: "🇬🇬",
        name: "Guernsey"
    },
    "GN": {
        flag: "🇬🇳",
        name: "Guinea"
    },
    "GW": {
        flag: "🇬🇼",
        name: "Guinea-Bissau"
    },
    "GY": {
        flag: "🇬🇾",
        name: "Guyana"
    },
    "HT": {
        flag: "🇭🇹",
        name: "Haiti"
    },
    "HM": {
        flag: "🇭🇲",
        name: "Heard Island and McDonald Islands"
    },
    "HN": {
        flag: "🇭🇳",
        name: "Honduras"
    },
    "HK": {
        flag: "🇭🇰",
        name: "Hong Kong"
    },
    "HU": {
        flag: "🇭🇺",
        name: "Hungary"
    },
    "IS": {
        flag: "🇮🇸",
        name: "Iceland"
    },
    "IN": {
        flag: "🇮🇳",
        name: "India"
    },
    "ID": {
        flag: "🇮🇩",
        name: "Indonesia"
    },
    "IR": {
        flag: "🇮🇷",
        name: "Iran"
    },
    "IQ": {
        flag: "🇮🇶",
        name: "Iraq"
    },
    "IE": {
        flag: "🇮🇪",
        name: "Ireland"
    },
    "IM": {
        flag: "🇮🇲",
        name: "Isle of Man"
    },
    "IL": {
        flag: "🇮🇱",
        name: "Israel"
    },
    "IT": {
        flag: "🇮🇹",
        name: "Italy"
    },
    "CI": {
        flag: "🇨🇮",
        name: "Ivory Coast"
    },
    "JM": {
        flag: "🇯🇲",
        name: "Jamaica"
    },
    "JP": {
        flag: "🇯🇵",
        name: "Japan"
    },
    "JE": {
        flag: "🇯🇪",
        name: "Jersey"
    },
    "JO": {
        flag: "🇯🇴",
        name: "Jordan"
    },
    "KZ": {
        flag: "🇰🇿",
        name: "Kazakhstan"
    },
    "KE": {
        flag: "🇰🇪",
        name: "Kenya"
    },
    "KI": {
        flag: "🇰🇮",
        name: "Kiribati"
    },
    "XK": {
        flag: "🇽🇰",
        name: "Kosovo"
    },
    "KW": {
        flag: "🇰🇼",
        name: "Kuwait"
    },
    "KG": {
        flag: "🇰🇬",
        name: "Kyrgyzstan"
    },
    "LA": {
        flag: "🇱🇦",
        name: "Laos"
    },
    "LV": {
        flag: "🇱🇻",
        name: "Latvia"
    },
    "LB": {
        flag: "🇱🇧",
        name: "Lebanon"
    },
    "LS": {
        flag: "🇱🇸",
        name: "Lesotho"
    },
    "LR": {
        flag: "🇱🇷",
        name: "Liberia"
    },
    "LY": {
        flag: "🇱🇾",
        name: "Libya"
    },
    "LI": {
        flag: "🇱🇮",
        name: "Liechtenstein"
    },
    "LT": {
        flag: "🇱🇹",
        name: "Lithuania"
    },
    "LU": {
        flag: "🇱🇺",
        name: "Luxembourg"
    },
    "MO": {
        flag: "🇲🇴",
        name: "Macao"
    },
    "MG": {
        flag: "🇲🇬",
        name: "Madagascar"
    },
    "MW": {
        flag: "🇲🇼",
        name: "Malawi"
    },
    "MY": {
        flag: "🇲🇾",
        name: "Malaysia"
    },
    "MV": {
        flag: "🇲🇻",
        name: "Maldives"
    },
    "ML": {
        flag: "🇲🇱",
        name: "Mali"
    },
    "MT": {
        flag: "🇲🇹",
        name: "Malta"
    },
    "MH": {
        flag: "🇲🇭",
        name: "Marshall Islands"
    },
    "MQ": {
        flag: "🇲🇶",
        name: "Martinique"
    },
    "MR": {
        flag: "🇲🇷",
        name: "Mauritania"
    },
    "MU": {
        flag: "🇲🇺",
        name: "Mauritius"
    },
    "YT": {
        flag: "🇾🇹",
        name: "Mayotte"
    },
    "MX": {
        flag: "🇲🇽",
        name: "Mexico"
    },
    "FM": {
        flag: "🇫🇲",
        name: "Micronesia"
    },
    "MD": {
        flag: "🇲🇩",
        name: "Moldova"
    },
    "MC": {
        flag: "🇲🇨",
        name: "Monaco"
    },
    "MN": {
        flag: "🇲🇳",
        name: "Mongolia"
    },
    "ME": {
        flag: "🇲🇪",
        name: "Montenegro"
    },
    "MS": {
        flag: "🇲🇸",
        name: "Montserrat"
    },
    "MA": {
        flag: "🇲🇦",
        name: "Morocco"
    },
    "MZ": {
        flag: "🇲🇿",
        name: "Mozambique"
    },
    "MM": {
        flag: "🇲🇲",
        name: "Myanmar"
    },
    "NA": {
        flag: "🇳🇦",
        name: "Namibia"
    },
    "NR": {
        flag: "🇳🇷",
        name: "Nauru"
    },
    "NP": {
        flag: "🇳🇵",
        name: "Nepal"
    },
    "AN": {
        flag: "🇦🇳",
        name: "Netherlands Antilles"
    },
    "NC": {
        flag: "🇳🇨",
        name: "New Caledonia"
    },
    "NZ": {
        flag: "🇳🇿",
        name: "New Zealand"
    },
    "NI": {
        flag: "🇳🇮",
        name: "Nicaragua"
    },
    "NE": {
        flag: "🇳🇪",
        name: "Niger"
    },
    "NG": {
        flag: "🇳🇬",
        name: "Nigeria"
    },
    "NU": {
        flag: "🇳🇺",
        name: "Niue"
    },
    "NF": {
        flag: "🇳🇫",
        name: "Norfolk Island"
    },
    "KP": {
        flag: "🇰🇵",
        name: "North Korea"
    },
    "MK": {
        flag: "🇲🇰",
        name: "North Macedonia"
    },
    "MP": {
        flag: "🇲🇵",
        name: "Northern Mariana Islands"
    },
    "NO": {
        flag: "🇳🇴",
        name: "Norway"
    },
    "OM": {
        flag: "🇴🇲",
        name: "Oman"
    },
    "PK": {
        flag: "🇵🇰",
        name: "Pakistan"
    },
    "PW": {
        flag: "🇵🇼",
        name: "Palau"
    },
    "PS": {
        flag: "🇵🇸",
        name: "Palestinian Territory"
    },
    "PA": {
        flag: "🇵🇦",
        name: "Panama"
    },
    "PG": {
        flag: "🇵🇬",
        name: "Papua New Guinea"
    },
    "PY": {
        flag: "🇵🇾",
        name: "Paraguay"
    },
    "PE": {
        flag: "🇵🇪",
        name: "Peru"
    },
    "PH": {
        flag: "🇵🇭",
        name: "Philippines"
    },
    "PN": {
        flag: "🇵🇳",
        name: "Pitcairn"
    },
    "PL": {
        flag: "🇵🇱",
        name: "Poland"
    },
    "PT": {
        flag: "🇵🇹",
        name: "Portugal"
    },
    "PR": {
        flag: "🇵🇷",
        name: "Puerto Rico"
    },
    "QA": {
        flag: "🇶🇦",
        name: "Qatar"
    },
    "CG": {
        flag: "🇨🇬",
        name: "Republic of the Congo"
    },
    "RE": {
        flag: "🇷🇪",
        name: "Reunion"
    },
    "RO": {
        flag: "🇷🇴",
        name: "Romania"
    },
    "RU": {
        flag: "🇷🇺",
        name: "Russia"
    },
    "RW": {
        flag: "🇷🇼",
        name: "Rwanda"
    },
    "BL": {
        flag: "🇧🇱",
        name: "Saint Barthelemy"
    },
    "SH": {
        flag: "🇸🇭",
        name: "Saint Helena"
    },
    "KN": {
        flag: "🇰🇳",
        name: "Saint Kitts and Nevis"
    },
    "LC": {
        flag: "🇱🇨",
        name: "Saint Lucia"
    },
    "MF": {
        flag: "🇲🇫",
        name: "Saint Martin"
    },
    "PM": {
        flag: "🇵🇲",
        name: "Saint Pierre and Miquelon"
    },
    "VC": {
        flag: "🇻🇨",
        name: "Saint Vincent and the Grenadines"
    },
    "WS": {
        flag: "🇼🇸",
        name: "Samoa"
    },
    "SM": {
        flag: "🇸🇲",
        name: "San Marino"
    },
    "ST": {
        flag: "🇸🇹",
        name: "Sao Tome and Principe"
    },
    "SA": {
        flag: "🇸🇦",
        name: "Saudi Arabia"
    },
    "SN": {
        flag: "🇸🇳",
        name: "Senegal"
    },
    "RS": {
        flag: "🇷🇸",
        name: "Serbia"
    },
    "CS": {
        flag: "🇨🇸",
        name: "Serbia and Montenegro"
    },
    "SC": {
        flag: "🇸🇨",
        name: "Seychelles"
    },
    "SL": {
        flag: "🇸🇱",
        name: "Sierra Leone"
    },
    "SG": {
        flag: "🇸🇬",
        name: "Singapore"
    },
    "SX": {
        flag: "🇸🇽",
        name: "Sint Maarten"
    },
    "SK": {
        flag: "🇸🇰",
        name: "Slovakia"
    },
    "SI": {
        flag: "🇸🇮",
        name: "Slovenia"
    },
    "SB": {
        flag: "🇸🇧",
        name: "Solomon Islands"
    },
    "SO": {
        flag: "🇸🇴",
        name: "Somalia"
    },
    "ZA": {
        flag: "🇿🇦",
        name: "South Africa"
    },
    "GS": {
        flag: "🇬🇸",
        name: "South Georgia and the South Sandwich Islands"
    },
    "KR": {
        flag: "🇰🇷",
        name: "South Korea"
    },
    "SS": {
        flag: "🇸🇸",
        name: "South Sudan"
    },
    "ES": {
        flag: "🇪🇸",
        name: "Spain"
    },
    "LK": {
        flag: "🇱🇰",
        name: "Sri Lanka"
    },
    "SD": {
        flag: "🇸🇩",
        name: "Sudan"
    },
    "SR": {
        flag: "🇸🇷",
        name: "Suriname"
    },
    "SJ": {
        flag: "🇸🇯",
        name: "Svalbard and Jan Mayen"
    },
    "SE": {
        flag: "🇸🇪",
        name: "Sweden"
    },
    "CH": {
        flag: "🇨🇭",
        name: "Switzerland"
    },
    "SY": {
        flag: "🇸🇾",
        name: "Syria"
    },
    "TW": {
        flag: "🇹🇼",
        name: "Taiwan"
    },
    "TJ": {
        flag: "🇹🇯",
        name: "Tajikistan"
    },
    "TZ": {
        flag: "🇹🇿",
        name: "Tanzania"
    },
    "TH": {
        flag: "🇹🇭",
        name: "Thailand"
    },
    "NL": {
        flag: "🇳🇱",
        name: "The Netherlands"
    },
    "TL": {
        flag: "🇹🇱",
        name: "Timor Leste"
    },
    "TG": {
        flag: "🇹🇬",
        name: "Togo"
    },
    "TK": {
        flag: "🇹🇰",
        name: "Tokelau"
    },
    "TO": {
        flag: "🇹🇴",
        name: "Tonga"
    },
    "TT": {
        flag: "🇹🇹",
        name: "Trinidad and Tobago"
    },
    "TN": {
        flag: "🇹🇳",
        name: "Tunisia"
    },
    "TR": {
        flag: "🇹🇷",
        name: "Turkey"
    },
    "TM": {
        flag: "🇹🇲",
        name: "Turkmenistan"
    },
    "TC": {
        flag: "🇹🇨",
        name: "Turks and Caicos Islands"
    },
    "TV": {
        flag: "🇹🇻",
        name: "Tuvalu"
    },
    "VI": {
        flag: "🇻🇮",
        name: "U.S. Virgin Islands"
    },
    "UG": {
        flag: "🇺🇬",
        name: "Uganda"
    },
    "UA": {
        flag: "🇺🇦",
        name: "Ukraine"
    },
    "AE": {
        flag: "🇦🇪",
        name: "United Arab Emirates"
    },
    "GB": {
        flag: "🇬🇧",
        name: "United Kingdom"
    },
    "US": {
        flag: "🇺🇸",
        name: "United States"
    },
    "UM": {
        flag: "🇺🇲",
        name: "United States Minor Outlying Islands"
    },
    "UY": {
        flag: "🇺🇾",
        name: "Uruguay"
    },
    "UZ": {
        flag: "🇺🇿",
        name: "Uzbekistan"
    },
    "VU": {
        flag: "🇻🇺",
        name: "Vanuatu"
    },
    "VA": {
        flag: "🇻🇦",
        name: "Vatican"
    },
    "VE": {
        flag: "🇻🇪",
        name: "Venezuela"
    },
    "VN": {
        flag: "🇻🇳",
        name: "Vietnam"
    },
    "WF": {
        flag: "🇼🇫",
        name: "Wallis and Futuna"
    },
    "EH": {
        flag: "🇪🇭",
        name: "Western Sahara"
    },
    "YE": {
        flag: "🇾🇪",
        name: "Yemen"
    },
    "ZM": {
        flag: "🇿🇲",
        name: "Zambia"
    },
    "ZW": {
        flag: "🇿🇼",
        name: "Zimbabwe"
    }
};
