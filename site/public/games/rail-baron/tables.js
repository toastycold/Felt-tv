// Destination tables from the 1977 rulebook (owner's copy). [odd, even] for rolls 2 through 12.
const T = (rows) => {
  const out = { odd: {}, even: {} };
  rows.forEach(([o, e], i) => { out.odd[i + 2] = o; out.even[i + 2] = e; });
  return out;
};
export const REGION_TABLE = T([
  ['Plains', 'Southwest'], ['Southeast', 'South Central'], ['Southeast', 'South Central'], ['Southeast', 'South Central'],
  ['North Central', 'Southwest'], ['North Central', 'Southwest'], ['Northeast', 'Plains'], ['Northeast', 'Northwest'],
  ['Northeast', 'Northwest'], ['Northeast', 'Plains'], ['Northeast', 'Northwest'],
]);
export const CITY_TABLES = {
  'Northeast': T([
    ['New York', 'New York'], ['New York', 'Washington'], ['New York', 'Pittsburgh'], ['Albany', 'Pittsburgh'],
    ['Boston', 'Philadelphia'], ['Buffalo', 'Washington'], ['Boston', 'Philadelphia'], ['Portland, ME', 'Baltimore'],
    ['New York', 'Baltimore'], ['New York', 'Baltimore'], ['New York', 'New York'],
  ]),
  'Southeast': T([
    ['Charlotte', 'Norfolk'], ['Charlotte', 'Norfolk'], ['Chattanooga', 'Norfolk'], ['Atlanta', 'Charleston'],
    ['Atlanta', 'Miami'], ['Atlanta', 'Jacksonville'], ['Richmond', 'Miami'], ['Knoxville', 'Tampa'],
    ['Mobile', 'Tampa'], ['Knoxville', 'Mobile'], ['Mobile', 'Norfolk'],
  ]),
  'North Central': T([
    ['Cleveland', 'Cincinnati'], ['Cleveland', 'Chicago'], ['Cleveland', 'Cincinnati'], ['Cleveland', 'Cincinnati'],
    ['Detroit', 'Columbus'], ['Detroit', 'Chicago'], ['Indianapolis', 'Chicago'], ['Milwaukee', 'St. Louis'],
    ['Milwaukee', 'St. Louis'], ['Chicago', 'St. Louis'], ['Milwaukee', 'Chicago'],
  ]),
  'South Central': T([
    ['Memphis', 'Shreveport'], ['Memphis', 'Shreveport'], ['Memphis', 'Dallas'], ['Little Rock', 'New Orleans'],
    ['New Orleans', 'Dallas'], ['Birmingham', 'San Antonio'], ['Louisville', 'Houston'], ['Nashville', 'Houston'],
    ['Nashville', 'Fort Worth'], ['Louisville', 'Fort Worth'], ['Memphis', 'Fort Worth'],
  ]),
  'Plains': T([
    ['Kansas City', 'Oklahoma City'], ['Kansas City', 'St. Paul'], ['Denver', 'Minneapolis'], ['Denver', 'St. Paul'],
    ['Denver', 'Minneapolis'], ['Kansas City', 'Oklahoma City'], ['Kansas City', 'Des Moines'], ['Kansas City', 'Omaha'],
    ['Pueblo', 'Omaha'], ['Pueblo', 'Fargo'], ['Oklahoma City', 'Fargo'],
  ]),
  'Northwest': T([
    ['Spokane', 'Spokane'], ['Spokane', 'Salt Lake City'], ['Seattle', 'Salt Lake City'], ['Seattle', 'Salt Lake City'],
    ['Seattle', 'Portland, OR'], ['Seattle', 'Portland, OR'], ['Rapid City', 'Portland, OR'], ['Casper', 'Pocatello'],
    ['Billings', 'Butte'], ['Billings', 'Butte'], ['Spokane', 'Portland, OR'],
  ]),
  'Southwest': T([
    ['San Diego', 'Los Angeles'], ['San Diego', 'Oakland'], ['Reno', 'Oakland'], ['San Diego', 'Oakland'],
    ['Sacramento', 'Los Angeles'], ['Las Vegas', 'Los Angeles'], ['Phoenix', 'Los Angeles'], ['El Paso', 'San Francisco'],
    ['Tucumcari', 'San Francisco'], ['Phoenix', 'San Francisco'], ['Phoenix', 'San Francisco'],
  ]),
};
// Abbreviations as printed on the 1977 price chart.
export const ABBR = {
  ACL: 'ACL', ATSF: 'AT&SF', BM: 'B&M', BO: 'B&O', CBQ: 'CB&Q', MILW: 'CMSTP&P', CNW: 'C&NW', CO: 'C&O', RI: 'CRI&P',
  DRGW: 'D&RGW', GMO: 'GM&O', GN: 'GN', IC: 'IC', MP: 'MP', LN: 'L&N', NP: 'NP', NW: 'N&W', NYC: 'NYC', NH: 'NYNH&H',
  PRR: 'PA', RFP: 'RF&P', SAL: 'SAL', SOU: 'SOU', SP: 'SP', SLSF: 'SLSF', TP: 'T&P', UP: 'UP', WP: 'WP',
};
