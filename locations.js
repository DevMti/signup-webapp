/**
 * locations.js
 * ---------------------------------------------------------------------------
 * Self-contained country -> cities dataset. No dependencies, no exports:
 * it simply defines `window.LOCATIONS` and must be loaded before `app.js`.
 *
 * Shape:
 *   window.LOCATIONS = {
 *     "<Country name>": {
 *       flag:   "<emoji flag>",        // optional, shown next to the name
 *       cities: ["<City>", "<City>"]   // required, order is preserved in the UI
 *     }
 *   }
 *
 * To swap this list out, replace the whole object below. `app.js` reads it
 * generically: countries are Object.keys(), cities come from `.cities`.
 * Country names are used verbatim in the submitted payload.
 * ---------------------------------------------------------------------------
 */
window.LOCATIONS = {
  Argentina: {
    flag: '🇦🇷',
    cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'Mar del Plata', 'Salta', 'San Miguel de Tucumán']
  },
  Australia: {
    flag: '🇦🇺',
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'Gold Coast', 'Hobart']
  },
  Austria: {
    flag: '🇦🇹',
    cities: ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt']
  },
  Belgium: {
    flag: '🇧🇪',
    cities: ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges']
  },
  Brazil: {
    flag: '🇧🇷',
    cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Recife']
  },
  Canada: {
    flag: '🇨🇦',
    cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Halifax']
  },
  Chile: {
    flag: '🇨🇱',
    cities: ['Santiago', 'Valparaíso', 'Concepción', 'Antofagasta', 'Viña del Mar', 'Temuco']
  },
  China: {
    flag: '🇨🇳',
    cities: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Wuhan', 'Xi’an', 'Nanjing']
  },
  Colombia: {
    flag: '🇨🇴',
    cities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga']
  },
  'Czech Republic': {
    flag: '🇨🇿',
    cities: ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Olomouc', 'Liberec']
  },
  Denmark: {
    flag: '🇩🇰',
    cities: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg']
  },
  Egypt: {
    flag: '🇪🇬',
    cities: ['Cairo', 'Alexandria', 'Giza', 'Luxor', 'Port Said', 'Aswan']
  },
  France: {
    flag: '🇫🇷',
    cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux', 'Lille', 'Strasbourg']
  },
  Germany: {
    flag: '🇩🇪',
    cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden']
  },
  Greece: {
    flag: '🇬🇷',
    cities: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos']
  },
  India: {
    flag: '🇮🇳',
    cities: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur']
  },
  Indonesia: {
    flag: '🇮🇩',
    cities: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Denpasar', 'Makassar']
  },
  Ireland: {
    flag: '🇮🇪',
    cities: ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford']
  },
  Italy: {
    flag: '🇮🇹',
    cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Venice']
  },
  Japan: {
    flag: '🇯🇵',
    cities: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kyoto', 'Kobe', 'Hiroshima']
  },
  Kazakhstan: {
    flag: '🇰🇿',
    cities: ['Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktobe', 'Taraz']
  },
  Mexico: {
    flag: '🇲🇽',
    cities: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'Cancún', 'Mérida', 'Querétaro']
  },
  Netherlands: {
    flag: '🇳🇱',
    cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen']
  },
  Nigeria: {
    flag: '🇳🇬',
    cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City']
  },
  Norway: {
    flag: '🇳🇴',
    cities: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø']
  },
  Pakistan: {
    flag: '🇵🇰',
    cities: ['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Peshawar', 'Multan']
  },
  Philippines: {
    flag: '🇵🇭',
    cities: ['Manila', 'Quezon City', 'Cebu City', 'Davao City', 'Makati', 'Baguio']
  },
  Poland: {
    flag: '🇵🇱',
    cities: ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Katowice']
  },
  Portugal: {
    flag: '🇵🇹',
    cities: ['Lisbon', 'Porto', 'Braga', 'Coimbra', 'Faro', 'Funchal']
  },
  Romania: {
    flag: '🇷🇴',
    cities: ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Brașov']
  },
  Russia: {
    flag: '🇷🇺',
    cities: ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod', 'Sochi', 'Vladivostok']
  },
  'Saudi Arabia': {
    flag: '🇸🇦',
    cities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar']
  },
  Singapore: {
    flag: '🇸🇬',
    cities: ['Singapore']
  },
  'South Africa': {
    flag: '🇿🇦',
    cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein']
  },
  'South Korea': {
    flag: '🇰🇷',
    cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Jeju City']
  },
  Spain: {
    flag: '🇪🇸',
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Bilbao', 'Logroño', 'Palma']
  },
  Sweden: {
    flag: '🇸🇪',
    cities: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Linköping']
  },
  Switzerland: {
    flag: '🇨🇭',
    cities: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Lugano']
  },
  Thailand: {
    flag: '🇹🇭',
    cities: ['Bangkok', 'Chiang Mai', 'Pattaya', 'Phuket', 'Hat Yai', 'Nonthaburi']
  },
  Turkey: {
    flag: '🇹🇷',
    cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep']
  },
  Ukraine: {
    flag: '🇺🇦',
    cities: ['Kyiv', 'Kharkiv', 'Odesa', 'Dnipro', 'Lviv', 'Zaporizhzhia', 'Vinnytsia']
  },
  'United Arab Emirates': {
    flag: '🇦🇪',
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Al Ain', 'Ras Al Khaimah']
  },
  'United Kingdom': {
    flag: '🇬🇧',
    cities: ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool', 'Edinburgh', 'Leeds', 'Bristol', 'Cardiff', 'Belfast']
  },
  'United States': {
    flag: '🇺🇸',
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Francisco', 'Seattle', 'Boston', 'Miami', 'Denver', 'Austin']
  },
  Vietnam: {
    flag: '🇻🇳',
    cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Can Tho', 'Nha Trang']
  }
};
