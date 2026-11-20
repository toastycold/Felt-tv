// Rail network for the Rail Baron rules, drawn from real geography and real historic routes.
// Places: [lat, lon, region?, population (1970 metro, thousands)?]. A region means it's a destination city.
export const REGIONS = ['Northeast', 'Southeast', 'North Central', 'South Central', 'Plains', 'Northwest', 'Southwest'];

export const PLACES = {
  // ---- Northeast
  'Albany': [42.65, -73.75, 'Northeast', 720], 'Baltimore': [39.29, -76.61, 'Northeast', 2070], 'Boston': [42.36, -71.06, 'Northeast', 3700],
  'Buffalo': [42.89, -78.88, 'Northeast', 1350], 'New York': [40.71, -74.0, 'Northeast', 16000], 'Philadelphia': [39.95, -75.17, 'Northeast', 4800],
  'Pittsburgh': [40.44, -80.0, 'Northeast', 2400], 'Portland, ME': [43.66, -70.26, 'Northeast', 190], 'Washington': [38.9, -77.04, 'Northeast', 2900],
  // ---- Southeast
  'Atlanta': [33.75, -84.39, 'Southeast', 1400], 'Charleston': [32.78, -79.93, 'Southeast', 300], 'Charlotte': [35.23, -80.84, 'Southeast', 400],
  'Chattanooga': [35.05, -85.31, 'Southeast', 300], 'Jacksonville': [30.33, -81.66, 'Southeast', 530], 'Knoxville': [35.96, -83.92, 'Southeast', 400],
  'Miami': [25.76, -80.19, 'Southeast', 1270], 'Mobile': [30.69, -88.04, 'Southeast', 380], 'Norfolk': [36.85, -76.29, 'Southeast', 680],
  'Richmond': [37.54, -77.44, 'Southeast', 520], 'Tampa': [27.95, -82.46, 'Southeast', 1000],
  // ---- North Central
  'Chicago': [41.88, -87.63, 'North Central', 6900], 'Cincinnati': [39.1, -84.51, 'North Central', 1380], 'Cleveland': [41.5, -81.69, 'North Central', 2060],
  'Columbus': [39.96, -83.0, 'North Central', 920], 'Detroit': [42.33, -83.05, 'North Central', 4200], 'Indianapolis': [39.77, -86.16, 'North Central', 1100],
  'Milwaukee': [43.04, -87.91, 'North Central', 1400], 'St. Louis': [38.63, -90.2, 'North Central', 2400],
  // ---- South Central
  'Birmingham': [33.52, -86.8, 'South Central', 740], 'Dallas': [32.78, -96.8, 'South Central', 1550], 'Fort Worth': [32.62, -97.6, 'South Central', 760],
  'Houston': [29.76, -95.37, 'South Central', 2000], 'Little Rock': [34.75, -92.29, 'South Central', 320], 'Louisville': [38.25, -85.76, 'South Central', 830],
  'Memphis': [35.15, -90.05, 'South Central', 770], 'Nashville': [36.16, -86.78, 'South Central', 540], 'New Orleans': [29.95, -90.07, 'South Central', 1050],
  'San Antonio': [29.42, -98.49, 'South Central', 860], 'Shreveport': [32.5, -93.75, 'South Central', 300],
  // ---- Plains
  'Denver': [39.74, -104.99, 'Plains', 1230], 'Des Moines': [41.59, -93.62, 'Plains', 290], 'Fargo': [46.88, -96.79, 'Plains', 120],
  'Kansas City': [39.1, -94.58, 'Plains', 1250], 'Minneapolis': [44.98, -93.27, 'Plains', 1800], 'St. Paul': [44.95, -93.09, 'Plains', 0], 'Oklahoma City': [35.47, -97.52, 'Plains', 640],
  'Omaha': [41.26, -95.94, 'Plains', 540], 'Pueblo': [38.25, -104.61, 'Plains', 120], 'Tulsa': [36.15, -95.99], 'Wichita': [37.69, -97.34],
  // ---- Northwest
  'Billings': [45.78, -108.5, 'Northwest', 90], 'Butte': [46.0, -112.53, 'Northwest', 40], 'Casper': [42.87, -106.31, 'Northwest', 50],
  'Pocatello': [42.87, -112.45, 'Northwest', 50], 'Portland, OR': [45.52, -122.68, 'Northwest', 1000], 'Rapid City': [44.08, -103.23, 'Northwest', 60],
  'Salt Lake City': [40.76, -111.89, 'Northwest', 560], 'Seattle': [47.61, -122.33, 'Northwest', 1420], 'Spokane': [47.66, -117.43, 'Northwest', 290],
  // ---- Southwest
  'Albuquerque': [35.08, -106.65], 'El Paso': [31.76, -106.49, 'Southwest', 360], 'Las Vegas': [36.17, -115.14, 'Southwest', 270],
  'Los Angeles': [34.05, -118.24, 'Southwest', 7000], 'Oakland': [37.8, -122.27, 'Southwest', 1600], 'Phoenix': [33.45, -112.07, 'Southwest', 970],
  'Reno': [39.53, -119.81, 'Southwest', 120], 'Sacramento': [38.58, -121.49, 'Southwest', 800], 'San Diego': [32.72, -117.16, 'Southwest', 1360],
  'San Francisco': [37.6, -122.75, 'Southwest', 1500], 'Tucumcari': [35.17, -103.72, 'Southwest', 8],

  // ---- Junction towns (interchange dots, not destinations)
  'Harrisburg': [40.27, -76.88], 'Fort Wayne': [41.08, -85.14], 'Toledo': [41.65, -83.54], 'Cumberland': [39.65, -78.76],
  'Parkersburg': [39.27, -81.56], 'Akron': [41.08, -81.52], 'Huntington': [38.42, -82.45], 'Ashland': [38.48, -82.64],
  'Charlottesville': [38.03, -78.48], 'Lynchburg': [37.41, -79.14], 'Roanoke': [37.27, -79.94], 'Bluefield': [37.27, -81.22],
  'Portsmouth, OH': [38.73, -82.99], 'Rocky Mount': [35.94, -77.79], 'Florence': [34.2, -79.76], 'Savannah': [32.08, -81.09],
  'Waycross': [31.21, -82.35], 'Albany, GA': [31.58, -84.16], 'Montgomery': [32.37, -86.3], 'Raleigh': [35.78, -78.64],
  'Hamlet': [34.88, -79.7], 'Columbia': [34.0, -81.03], 'Wildwood': [28.86, -82.04], 'West Palm Beach': [26.71, -80.05],
  'Tallahassee': [30.44, -84.28], 'Danville': [36.59, -79.4], 'Greensboro': [36.07, -79.79], 'Meridian': [32.36, -88.7],
  'Lexington': [38.04, -84.5], 'Asheville': [35.6, -82.55], 'Macon': [32.84, -83.63], 'Evansville': [37.97, -87.57],
  'Champaign': [40.12, -88.24], 'Centralia': [38.52, -89.13], 'Jackson, MS': [32.3, -90.18], 'Jackson, TN': [35.61, -88.81],
  'Rockford': [42.27, -89.09], 'Dubuque': [42.5, -90.66], 'Waterloo': [42.49, -92.34], 'Fort Dodge': [42.5, -94.17],
  'Springfield, IL': [39.8, -89.64], 'Roodhouse': [39.48, -90.37], 'Texarkana': [33.43, -94.05], 'Palestine': [31.76, -95.63],
  'Abilene': [32.45, -99.73], 'Springfield, MO': [37.21, -93.29], 'Davenport': [41.52, -90.58], 'Lincoln': [40.81, -96.68],
  'Topeka': [39.05, -95.68], 'Liberal': [37.04, -100.92], 'Amarillo': [35.22, -101.83], 'Galesburg': [40.95, -90.37],
  'Burlington': [40.81, -91.11], 'Alliance': [42.1, -102.87], 'Sheridan': [44.8, -106.96], 'Cheyenne': [41.14, -104.82],
  'St. Joseph': [39.77, -94.85], 'La Crosse': [43.8, -91.24], 'Aberdeen': [45.46, -98.49], 'Miles City': [46.41, -105.84],
  'Cedar Rapids': [41.98, -91.67], 'Madison': [43.07, -89.4], 'Pierre': [44.37, -100.35], 'Chadron': [42.83, -103.0],
  'Minot': [48.23, -101.29], 'Havre': [48.55, -109.68], 'Shelby': [48.5, -111.86], 'Great Falls': [47.5, -111.3],
  'Bismarck': [46.81, -100.78], 'Missoula': [46.87, -113.99], 'Pasco': [46.24, -119.1], 'North Platte': [41.12, -100.77],
  'Ogden': [41.22, -111.97], 'Boise': [43.62, -116.2], 'Salina': [38.84, -97.61], 'Pendleton': [45.67, -118.79],
  'Yuma': [32.69, -114.62], 'Tucson': [32.22, -110.97], 'Fort Madison': [40.63, -91.31], 'Emporia': [38.4, -96.18],
  'Newton': [38.05, -97.35], 'Dodge City': [37.75, -100.02], 'La Junta': [37.98, -103.54], 'Raton': [36.9, -104.44],
  'Gallup': [35.53, -108.74], 'Flagstaff': [35.2, -111.65], 'Barstow': [34.9, -117.02], 'Bakersfield': [35.37, -119.02],
  'Clovis': [34.4, -103.2], 'Belen': [34.66, -106.78], 'Winnemucca': [40.97, -117.74], 'Grand Junction': [39.06, -108.55],
  'Colorado Springs': [38.83, -104.82], 'New Haven': [41.31, -72.92], 'Providence': [41.82, -71.41], 'Hartford': [41.76, -72.67],
  'Springfield, MA': [42.1, -72.59], 'Williamsport': [41.24, -77.0], 'Sherman': [33.64, -96.61], 'Pine Bluff': [34.23, -92.0],
  'Hoisington': [38.52, -98.78], 'Grand Rapids': [42.96, -85.67], 'Paducah': [37.08, -88.6], 'Corinth': [34.93, -88.52],
  'Selma': [32.41, -87.02], 'Vicksburg': [32.35, -90.88],
};

// The 28 railroads with the game's prices. Routes are strands of places the line runs through, in order.
export const RAILROADS = [
  { id: 'SP', name: 'Southern Pacific', price: 42000, routes: [
    ['Oakland', 'Sacramento', 'Reno', 'Winnemucca', 'Ogden'], ['Portland, OR', 'Sacramento'], ['San Francisco', 'Los Angeles'],
    ['San Francisco', 'Oakland'], ['Oakland', 'Bakersfield', 'Los Angeles'],
    ['Los Angeles', 'Yuma', 'Phoenix', 'Tucson', 'El Paso', 'San Antonio', 'Houston', 'New Orleans'],
    ['Tucumcari', 'El Paso'], ['Los Angeles', 'San Diego'], ['Houston', 'Dallas'],
    ['St. Louis', 'Pine Bluff', 'Texarkana', 'Dallas', 'Fort Worth'], ['Memphis', 'Pine Bluff']] },
  { id: 'ATSF', name: 'Atchison, Topeka & Santa Fe', price: 40000, routes: [
    ['Chicago', 'Fort Madison', 'Kansas City', 'Emporia', 'Newton', 'Dodge City', 'La Junta', 'Pueblo', 'Colorado Springs', 'Denver'],
    ['La Junta', 'Raton', 'Albuquerque', 'Gallup', 'Flagstaff', 'Barstow', 'Los Angeles'], ['Barstow', 'Bakersfield', 'Oakland'],
    ['Albuquerque', 'Belen', 'El Paso'], ['Newton', 'Amarillo', 'Clovis', 'Belen'], ['Newton', 'Wichita', 'Oklahoma City', 'Fort Worth', 'Houston'],
    ['Fort Worth', 'Dallas'], ['Los Angeles', 'San Diego'], ['Flagstaff', 'Phoenix']] },
  { id: 'UP', name: 'Union Pacific', price: 40000, routes: [
    ['Omaha', 'North Platte', 'Cheyenne', 'Ogden', 'Salt Lake City'], ['Kansas City', 'Topeka', 'Salina', 'Denver', 'Cheyenne'],
    ['Salt Lake City', 'Las Vegas', 'Los Angeles'], ['Ogden', 'Pocatello', 'Boise', 'Pendleton', 'Portland, OR'],
    ['Pocatello', 'Butte'], ['Pendleton', 'Spokane'], ['Portland, OR', 'Seattle']] },
  { id: 'PRR', name: 'Pennsylvania', price: 30000, routes: [
    ['New York', 'Philadelphia', 'Baltimore', 'Washington'], ['Philadelphia', 'Harrisburg', 'Pittsburgh', 'Columbus', 'Indianapolis', 'St. Louis'],
    ['Pittsburgh', 'Fort Wayne', 'Chicago'], ['Columbus', 'Cincinnati'], ['Harrisburg', 'Williamsport', 'Buffalo'], ['Pittsburgh', 'Cleveland'],
    ['Harrisburg', 'Baltimore']] },
  { id: 'RI', name: 'Chicago, Rock Island & Pacific', price: 29000, routes: [
    ['Chicago', 'Davenport', 'Des Moines', 'Omaha', 'Lincoln', 'Denver'], ['Des Moines', 'Kansas City'], ['St. Paul', 'Minneapolis', 'Des Moines'],
    ['Kansas City', 'Topeka', 'Liberal', 'Tucumcari'], ['Topeka', 'Wichita', 'Oklahoma City', 'Fort Worth', 'Dallas', 'Houston'],
    ['Memphis', 'Little Rock', 'Oklahoma City', 'Amarillo', 'Tucumcari'], ['Denver', 'Colorado Springs']] },
  { id: 'NYC', name: 'New York Central', price: 28000, routes: [
    ['New York', 'Albany', 'Buffalo', 'Cleveland', 'Toledo', 'Chicago'], ['Albany', 'Springfield, MA', 'Boston'], ['Buffalo', 'Detroit', 'Chicago'],
    ['Detroit', 'Toledo'], ['Cleveland', 'Columbus', 'Cincinnati'], ['Cleveland', 'Indianapolis', 'St. Louis'], ['Cincinnati', 'Indianapolis', 'Chicago'],
    ['Pittsburgh', 'Cleveland']] },
  { id: 'BO', name: 'Baltimore & Ohio', price: 24000, routes: [
    ['New York', 'Philadelphia', 'Baltimore', 'Washington'], ['Washington', 'Cumberland', 'Pittsburgh', 'Akron', 'Chicago'],
    ['Cumberland', 'Parkersburg', 'Cincinnati', 'St. Louis'], ['Cincinnati', 'Toledo', 'Detroit'], ['Pittsburgh', 'Buffalo'], ['Akron', 'Cleveland'],
    ['Cincinnati', 'Indianapolis']] },
  { id: 'MP', name: 'Missouri Pacific', price: 21000, routes: [
    ['St. Louis', 'Kansas City', 'Omaha'], ['Kansas City', 'Hoisington', 'Pueblo'], ['St. Louis', 'Little Rock', 'Texarkana', 'Palestine', 'Houston'],
    ['Palestine', 'San Antonio'], ['Memphis', 'Little Rock'], ['New Orleans', 'Houston'], ['Texarkana', 'Fort Worth']] },
  { id: 'CO', name: 'Chesapeake & Ohio', price: 20000, routes: [
    ['Norfolk', 'Richmond', 'Charlottesville', 'Huntington', 'Cincinnati'], ['Washington', 'Charlottesville'],
    ['Huntington', 'Ashland', 'Columbus', 'Toledo', 'Detroit'], ['Cincinnati', 'Indianapolis', 'Chicago'], ['Detroit', 'Grand Rapids', 'Chicago'],
    ['Ashland', 'Lexington', 'Louisville']] },
  { id: 'SOU', name: 'Southern', price: 20000, routes: [
    ['Washington', 'Charlottesville', 'Lynchburg', 'Danville', 'Greensboro', 'Charlotte', 'Atlanta', 'Birmingham', 'Meridian', 'New Orleans'],
    ['Cincinnati', 'Lexington', 'Chattanooga', 'Atlanta'], ['Chattanooga', 'Birmingham'], ['Chattanooga', 'Knoxville', 'Asheville', 'Greensboro'],
    ['Charlotte', 'Columbia', 'Charleston'], ['Atlanta', 'Macon', 'Jacksonville'], ['Chattanooga', 'Memphis'], ['St. Louis', 'Louisville', 'Lexington'],
    ['Richmond', 'Danville'], ['Birmingham', 'Selma', 'Mobile']] },
  { id: 'CBQ', name: 'Chicago, Burlington & Quincy', price: 20000, routes: [
    ['Chicago', 'Galesburg', 'Burlington', 'Omaha', 'Lincoln', 'Denver'], ['Galesburg', 'Kansas City'], ['Chicago', 'Dubuque', 'La Crosse', 'St. Paul', 'Minneapolis'],
    ['St. Louis', 'Burlington'], ['Lincoln', 'Alliance', 'Sheridan', 'Billings'], ['Denver', 'Cheyenne', 'Casper'],
    ['Denver', 'Pueblo', 'Amarillo', 'Fort Worth', 'Dallas', 'Houston'], ['Kansas City', 'St. Joseph', 'Omaha']] },
  { id: 'SLSF', name: 'St. Louis–San Francisco (Frisco)', price: 19000, routes: [
    ['St. Louis', 'Springfield, MO', 'Tulsa', 'Oklahoma City'], ['Kansas City', 'Springfield, MO', 'Memphis', 'Birmingham'],
    ['Tulsa', 'Sherman', 'Dallas'], ['Kansas City', 'Tulsa']] },
  { id: 'LN', name: 'Louisville & Nashville', price: 18000, routes: [
    ['Cincinnati', 'Louisville', 'Nashville', 'Birmingham', 'Montgomery', 'Mobile', 'New Orleans'], ['Louisville', 'Lexington', 'Knoxville', 'Atlanta'],
    ['Nashville', 'Chattanooga', 'Atlanta'], ['St. Louis', 'Evansville', 'Nashville'], ['Memphis', 'Nashville']] },
  { id: 'MILW', name: 'Chicago, Milwaukee, St. Paul & Pacific', price: 18000, routes: [
    ['Chicago', 'Milwaukee', 'La Crosse', 'St. Paul', 'Minneapolis', 'Aberdeen', 'Miles City', 'Butte', 'Missoula', 'Spokane', 'Seattle'],
    ['Chicago', 'Davenport', 'Kansas City'], ['Chicago', 'Cedar Rapids', 'Omaha']] },
  { id: 'GN', name: 'Great Northern', price: 17000, routes: [
    ['St. Paul', 'Minneapolis', 'Fargo', 'Minot', 'Havre', 'Shelby', 'Spokane', 'Seattle'], ['Havre', 'Great Falls', 'Butte'], ['Seattle', 'Portland, OR'],
    ['Spokane', 'Pasco', 'Portland, OR']] },
  { id: 'SAL', name: 'Seaboard Air Line', price: 14000, routes: [
    ['Richmond', 'Raleigh', 'Hamlet', 'Columbia', 'Savannah', 'Jacksonville', 'Wildwood', 'Tampa'], ['Wildwood', 'West Palm Beach', 'Miami'],
    ['Hamlet', 'Charlotte', 'Atlanta', 'Birmingham'], ['Norfolk', 'Raleigh'], ['Jacksonville', 'Tallahassee']] },
  { id: 'IC', name: 'Illinois Central', price: 14000, routes: [
    ['Chicago', 'Champaign', 'Centralia', 'Memphis', 'Jackson, MS', 'New Orleans'], ['Chicago', 'Rockford', 'Dubuque', 'Waterloo', 'Fort Dodge', 'Omaha'],
    ['Centralia', 'St. Louis'], ['Memphis', 'Birmingham'], ['Jackson, MS', 'Vicksburg', 'Shreveport'], ['Louisville', 'Paducah', 'Memphis']] },
  { id: 'CNW', name: 'Chicago & North Western', price: 14000, routes: [
    ['Chicago', 'Cedar Rapids', 'Omaha'], ['Chicago', 'Madison', 'St. Paul', 'Minneapolis'], ['Chicago', 'Milwaukee'], ['Minneapolis', 'Omaha'],
    ['Minneapolis', 'Pierre', 'Rapid City', 'Chadron', 'Casper'], ['Omaha', 'Chadron']] },
  { id: 'NP', name: 'Northern Pacific', price: 14000, routes: [
    ['St. Paul', 'Minneapolis', 'Fargo', 'Bismarck', 'Billings', 'Butte', 'Missoula', 'Spokane', 'Pasco', 'Seattle'], ['Seattle', 'Portland, OR']] },
  { id: 'ACL', name: 'Atlantic Coast Line', price: 12000, routes: [
    ['Richmond', 'Rocky Mount', 'Florence', 'Charleston', 'Savannah', 'Jacksonville', 'Tampa'], ['Rocky Mount', 'Norfolk'],
    ['Jacksonville', 'Waycross', 'Albany, GA', 'Montgomery']] },
  { id: 'NW', name: 'Norfolk & Western', price: 12000, routes: [
    ['Norfolk', 'Lynchburg', 'Roanoke', 'Bluefield', 'Portsmouth, OH', 'Cincinnati'], ['Portsmouth, OH', 'Columbus']] },
  { id: 'GMO', name: 'Gulf, Mobile & Ohio', price: 12000, routes: [
    ['Chicago', 'Springfield, IL', 'St. Louis'], ['St. Louis', 'Jackson, TN', 'Corinth', 'Meridian', 'Mobile'], ['Kansas City', 'Roodhouse', 'Springfield, IL']] },
  { id: 'TP', name: 'Texas & Pacific', price: 10000, routes: [
    ['New Orleans', 'Shreveport', 'Dallas', 'Fort Worth', 'Abilene', 'El Paso'], ['Texarkana', 'Dallas']] },
  { id: 'WP', name: 'Western Pacific', price: 8000, routes: [['Oakland', 'Sacramento', 'Winnemucca', 'Salt Lake City']] },
  { id: 'DRGW', name: 'Denver & Rio Grande Western', price: 6000, routes: [
    ['Denver', 'Grand Junction', 'Salt Lake City', 'Ogden'], ['Denver', 'Colorado Springs', 'Pueblo'], ['Pueblo', 'Grand Junction']] },
  { id: 'BM', name: 'Boston & Maine', price: 4000, routes: [['Boston', 'Portland, ME'], ['Boston', 'Albany']] },
  { id: 'NH', name: 'New York, New Haven & Hartford', price: 4000, routes: [['New York', 'New Haven', 'Providence', 'Boston'], ['New Haven', 'Hartford', 'Springfield, MA']] },
  { id: 'RFP', name: 'Richmond, Fredericksburg & Potomac', price: 4000, routes: [['Washington', 'Richmond']] },
];
