// src/data/vehicles.ts
// Comprehensive vehicle database with makes, models, and production years

export type VehicleModel = {
  name: string;
  yearFrom: number;
  yearTo: number | null; // null means still in production
};

export type VehicleDatabase = {
  [make: string]: VehicleModel[];
};

export const VEHICLE_DATABASE: VehicleDatabase = {
  "Alfa Romeo": [
    { name: "Giulia", yearFrom: 2015, yearTo: null },
    { name: "Stelvio", yearFrom: 2016, yearTo: null },
    { name: "Giulietta", yearFrom: 2010, yearTo: 2020 },
    { name: "MiTo", yearFrom: 2008, yearTo: 2018 },
    { name: "4C", yearFrom: 2013, yearTo: 2020 },
    { name: "159", yearFrom: 2005, yearTo: 2011 },
    { name: "147", yearFrom: 2000, yearTo: 2010 },
    { name: "156", yearFrom: 1997, yearTo: 2007 },
  ],
  "Aston Martin": [
    { name: "DB11", yearFrom: 2016, yearTo: null },
    { name: "DB12", yearFrom: 2023, yearTo: null },
    { name: "DBX", yearFrom: 2020, yearTo: null },
    { name: "Vantage", yearFrom: 2005, yearTo: null },
    { name: "DBS", yearFrom: 2007, yearTo: null },
    { name: "DB9", yearFrom: 2004, yearTo: 2016 },
    { name: "Vanquish", yearFrom: 2001, yearTo: 2018 },
    { name: "Rapide", yearFrom: 2010, yearTo: 2020 },
    { name: "Valkyrie", yearFrom: 2021, yearTo: null },
  ],
  "Audi": [
    { name: "A1", yearFrom: 2010, yearTo: null },
    { name: "A3", yearFrom: 1996, yearTo: null },
    { name: "A4", yearFrom: 1994, yearTo: null },
    { name: "A5", yearFrom: 2007, yearTo: null },
    { name: "A6", yearFrom: 1994, yearTo: null },
    { name: "A7", yearFrom: 2010, yearTo: null },
    { name: "A8", yearFrom: 1994, yearTo: null },
    { name: "Q2", yearFrom: 2016, yearTo: null },
    { name: "Q3", yearFrom: 2011, yearTo: null },
    { name: "Q4 e-tron", yearFrom: 2021, yearTo: null },
    { name: "Q5", yearFrom: 2008, yearTo: null },
    { name: "Q7", yearFrom: 2005, yearTo: null },
    { name: "Q8", yearFrom: 2018, yearTo: null },
    { name: "TT", yearFrom: 1998, yearTo: null },
    { name: "R8", yearFrom: 2006, yearTo: null },
    { name: "RS3", yearFrom: 2011, yearTo: null },
    { name: "RS4", yearFrom: 1999, yearTo: null },
    { name: "RS5", yearFrom: 2010, yearTo: null },
    { name: "RS6", yearFrom: 2002, yearTo: null },
    { name: "RS7", yearFrom: 2013, yearTo: null },
    { name: "e-tron", yearFrom: 2018, yearTo: null },
    { name: "e-tron GT", yearFrom: 2021, yearTo: null },
  ],
  "Bentley": [
    { name: "Continental GT", yearFrom: 2003, yearTo: null },
    { name: "Flying Spur", yearFrom: 2005, yearTo: null },
    { name: "Bentayga", yearFrom: 2015, yearTo: null },
    { name: "Mulsanne", yearFrom: 2010, yearTo: 2020 },
    { name: "Arnage", yearFrom: 1998, yearTo: 2009 },
  ],
  "BMW": [
    { name: "1 Series", yearFrom: 2004, yearTo: null },
    { name: "2 Series", yearFrom: 2013, yearTo: null },
    { name: "3 Series", yearFrom: 1975, yearTo: null },
    { name: "4 Series", yearFrom: 2013, yearTo: null },
    { name: "5 Series", yearFrom: 1972, yearTo: null },
    { name: "6 Series", yearFrom: 1976, yearTo: 2018 },
    { name: "7 Series", yearFrom: 1977, yearTo: null },
    { name: "8 Series", yearFrom: 1989, yearTo: null },
    { name: "X1", yearFrom: 2009, yearTo: null },
    { name: "X2", yearFrom: 2018, yearTo: null },
    { name: "X3", yearFrom: 2003, yearTo: null },
    { name: "X4", yearFrom: 2014, yearTo: null },
    { name: "X5", yearFrom: 1999, yearTo: null },
    { name: "X6", yearFrom: 2008, yearTo: null },
    { name: "X7", yearFrom: 2018, yearTo: null },
    { name: "Z3", yearFrom: 1995, yearTo: 2002 },
    { name: "Z4", yearFrom: 2002, yearTo: null },
    { name: "M2", yearFrom: 2015, yearTo: null },
    { name: "M3", yearFrom: 1985, yearTo: null },
    { name: "M4", yearFrom: 2014, yearTo: null },
    { name: "M5", yearFrom: 1984, yearTo: null },
    { name: "M6", yearFrom: 1983, yearTo: 2018 },
    { name: "M8", yearFrom: 2019, yearTo: null },
    { name: "i3", yearFrom: 2013, yearTo: 2022 },
    { name: "i4", yearFrom: 2021, yearTo: null },
    { name: "i7", yearFrom: 2022, yearTo: null },
    { name: "iX", yearFrom: 2021, yearTo: null },
  ],
  "Chevrolet": [
    { name: "Corvette", yearFrom: 1953, yearTo: null },
    { name: "Camaro", yearFrom: 1966, yearTo: null },
    { name: "Silverado", yearFrom: 1998, yearTo: null },
    { name: "Tahoe", yearFrom: 1995, yearTo: null },
    { name: "Suburban", yearFrom: 1935, yearTo: null },
    { name: "Equinox", yearFrom: 2004, yearTo: null },
    { name: "Blazer", yearFrom: 1969, yearTo: null },
    { name: "Malibu", yearFrom: 1964, yearTo: null },
  ],
  "Chrysler": [
    { name: "300", yearFrom: 2004, yearTo: null },
    { name: "Pacifica", yearFrom: 2003, yearTo: null },
    { name: "Voyager", yearFrom: 1983, yearTo: null },
  ],
  "Citroën": [
    { name: "C1", yearFrom: 2005, yearTo: 2021 },
    { name: "C3", yearFrom: 2002, yearTo: null },
    { name: "C3 Aircross", yearFrom: 2017, yearTo: null },
    { name: "C4", yearFrom: 2004, yearTo: null },
    { name: "C4 Cactus", yearFrom: 2014, yearTo: 2020 },
    { name: "C5 Aircross", yearFrom: 2017, yearTo: null },
    { name: "Berlingo", yearFrom: 1996, yearTo: null },
    { name: "SpaceTourer", yearFrom: 2016, yearTo: null },
  ],
  "Dacia": [
    { name: "Sandero", yearFrom: 2008, yearTo: null },
    { name: "Duster", yearFrom: 2010, yearTo: null },
    { name: "Logan", yearFrom: 2004, yearTo: null },
    { name: "Spring", yearFrom: 2021, yearTo: null },
    { name: "Jogger", yearFrom: 2021, yearTo: null },
  ],
  "Dodge": [
    { name: "Challenger", yearFrom: 1970, yearTo: null },
    { name: "Charger", yearFrom: 1966, yearTo: null },
    { name: "Durango", yearFrom: 1997, yearTo: null },
    { name: "Viper", yearFrom: 1991, yearTo: 2017 },
  ],
  "Ferrari": [
    { name: "296 GTB", yearFrom: 2021, yearTo: null },
    { name: "488", yearFrom: 2015, yearTo: 2020 },
    { name: "812 Superfast", yearFrom: 2017, yearTo: null },
    { name: "F8 Tributo", yearFrom: 2019, yearTo: null },
    { name: "SF90", yearFrom: 2019, yearTo: null },
    { name: "Roma", yearFrom: 2020, yearTo: null },
    { name: "Portofino", yearFrom: 2017, yearTo: null },
    { name: "LaFerrari", yearFrom: 2013, yearTo: 2018 },
    { name: "F12", yearFrom: 2012, yearTo: 2017 },
    { name: "California", yearFrom: 2008, yearTo: 2017 },
    { name: "458", yearFrom: 2009, yearTo: 2015 },
    { name: "599", yearFrom: 2006, yearTo: 2012 },
  ],
  "Fiat": [
    { name: "500", yearFrom: 2007, yearTo: null },
    { name: "500X", yearFrom: 2014, yearTo: null },
    { name: "Panda", yearFrom: 1980, yearTo: null },
    { name: "Tipo", yearFrom: 1988, yearTo: null },
    { name: "124 Spider", yearFrom: 2016, yearTo: 2020 },
  ],
  "Ford": [
    { name: "Fiesta", yearFrom: 1976, yearTo: 2023 },
    { name: "Focus", yearFrom: 1998, yearTo: null },
    { name: "Mondeo", yearFrom: 1992, yearTo: 2022 },
    { name: "Mustang", yearFrom: 1964, yearTo: null },
    { name: "Puma", yearFrom: 1997, yearTo: null },
    { name: "Kuga", yearFrom: 2008, yearTo: null },
    { name: "EcoSport", yearFrom: 2003, yearTo: null },
    { name: "Edge", yearFrom: 2006, yearTo: null },
    { name: "Explorer", yearFrom: 1990, yearTo: null },
    { name: "S-MAX", yearFrom: 2006, yearTo: null },
    { name: "Galaxy", yearFrom: 1995, yearTo: null },
    { name: "Ka", yearFrom: 1996, yearTo: 2016 },
    { name: "Ranger", yearFrom: 1983, yearTo: null },
    { name: "Transit", yearFrom: 1965, yearTo: null },
    { name: "GT", yearFrom: 2004, yearTo: null },
    { name: "F-150", yearFrom: 1948, yearTo: null },
    { name: "Bronco", yearFrom: 1965, yearTo: null },
  ],
  "Honda": [
    { name: "Civic", yearFrom: 1972, yearTo: null },
    { name: "Accord", yearFrom: 1976, yearTo: null },
    { name: "CR-V", yearFrom: 1995, yearTo: null },
    { name: "HR-V", yearFrom: 1998, yearTo: null },
    { name: "Jazz", yearFrom: 2001, yearTo: null },
    { name: "e", yearFrom: 2020, yearTo: null },
    { name: "NSX", yearFrom: 1990, yearTo: null },
    { name: "S2000", yearFrom: 1999, yearTo: 2009 },
    { name: "Civic Type R", yearFrom: 1997, yearTo: null },
    { name: "Integra", yearFrom: 1985, yearTo: null },
  ],
  "Hyundai": [
    { name: "i10", yearFrom: 2007, yearTo: null },
    { name: "i20", yearFrom: 2008, yearTo: null },
    { name: "i30", yearFrom: 2007, yearTo: null },
    { name: "Ioniq", yearFrom: 2016, yearTo: null },
    { name: "Ioniq 5", yearFrom: 2021, yearTo: null },
    { name: "Ioniq 6", yearFrom: 2022, yearTo: null },
    { name: "Kona", yearFrom: 2017, yearTo: null },
    { name: "Tucson", yearFrom: 2004, yearTo: null },
    { name: "Santa Fe", yearFrom: 2000, yearTo: null },
  ],
  "Jaguar": [
    { name: "XE", yearFrom: 2015, yearTo: null },
    { name: "XF", yearFrom: 2007, yearTo: null },
    { name: "XJ", yearFrom: 1968, yearTo: 2019 },
    { name: "F-Type", yearFrom: 2013, yearTo: null },
    { name: "F-Pace", yearFrom: 2015, yearTo: null },
    { name: "E-Pace", yearFrom: 2017, yearTo: null },
    { name: "I-Pace", yearFrom: 2018, yearTo: null },
    { name: "X-Type", yearFrom: 2001, yearTo: 2009 },
    { name: "S-Type", yearFrom: 1998, yearTo: 2007 },
  ],
  "Jeep": [
    { name: "Wrangler", yearFrom: 1986, yearTo: null },
    { name: "Cherokee", yearFrom: 1974, yearTo: null },
    { name: "Grand Cherokee", yearFrom: 1992, yearTo: null },
    { name: "Compass", yearFrom: 2006, yearTo: null },
    { name: "Renegade", yearFrom: 2014, yearTo: null },
    { name: "Gladiator", yearFrom: 2019, yearTo: null },
  ],
  "Kia": [
    { name: "Picanto", yearFrom: 2004, yearTo: null },
    { name: "Rio", yearFrom: 1999, yearTo: null },
    { name: "Ceed", yearFrom: 2006, yearTo: null },
    { name: "Stonic", yearFrom: 2017, yearTo: null },
    { name: "Niro", yearFrom: 2016, yearTo: null },
    { name: "Sportage", yearFrom: 1993, yearTo: null },
    { name: "Sorento", yearFrom: 2002, yearTo: null },
    { name: "EV6", yearFrom: 2021, yearTo: null },
    { name: "Stinger", yearFrom: 2017, yearTo: null },
  ],
  "Lamborghini": [
    { name: "Aventador", yearFrom: 2011, yearTo: 2022 },
    { name: "Huracán", yearFrom: 2014, yearTo: null },
    { name: "Urus", yearFrom: 2018, yearTo: null },
    { name: "Revuelto", yearFrom: 2023, yearTo: null },
    { name: "Gallardo", yearFrom: 2003, yearTo: 2013 },
    { name: "Murciélago", yearFrom: 2001, yearTo: 2010 },
  ],
  "Land Rover": [
    { name: "Defender", yearFrom: 1983, yearTo: null },
    { name: "Discovery", yearFrom: 1989, yearTo: null },
    { name: "Discovery Sport", yearFrom: 2014, yearTo: null },
    { name: "Range Rover", yearFrom: 1970, yearTo: null },
    { name: "Range Rover Sport", yearFrom: 2005, yearTo: null },
    { name: "Range Rover Evoque", yearFrom: 2011, yearTo: null },
    { name: "Range Rover Velar", yearFrom: 2017, yearTo: null },
    { name: "Freelander", yearFrom: 1997, yearTo: 2014 },
  ],
  "Lexus": [
    { name: "IS", yearFrom: 1998, yearTo: null },
    { name: "ES", yearFrom: 1989, yearTo: null },
    { name: "GS", yearFrom: 1991, yearTo: 2020 },
    { name: "LS", yearFrom: 1989, yearTo: null },
    { name: "RC", yearFrom: 2014, yearTo: null },
    { name: "LC", yearFrom: 2017, yearTo: null },
    { name: "UX", yearFrom: 2018, yearTo: null },
    { name: "NX", yearFrom: 2014, yearTo: null },
    { name: "RX", yearFrom: 1998, yearTo: null },
    { name: "LFA", yearFrom: 2010, yearTo: 2012 },
  ],
  "Lotus": [
    { name: "Elise", yearFrom: 1996, yearTo: 2021 },
    { name: "Exige", yearFrom: 2000, yearTo: 2021 },
    { name: "Evora", yearFrom: 2009, yearTo: 2021 },
    { name: "Emira", yearFrom: 2021, yearTo: null },
    { name: "Evija", yearFrom: 2021, yearTo: null },
  ],
  "Maserati": [
    { name: "Ghibli", yearFrom: 1966, yearTo: null },
    { name: "Quattroporte", yearFrom: 1963, yearTo: null },
    { name: "Levante", yearFrom: 2016, yearTo: null },
    { name: "GranTurismo", yearFrom: 2007, yearTo: null },
    { name: "GranCabrio", yearFrom: 2009, yearTo: null },
    { name: "MC20", yearFrom: 2020, yearTo: null },
  ],
  "Mazda": [
    { name: "2", yearFrom: 2002, yearTo: null },
    { name: "3", yearFrom: 2003, yearTo: null },
    { name: "6", yearFrom: 2002, yearTo: 2021 },
    { name: "CX-3", yearFrom: 2015, yearTo: null },
    { name: "CX-5", yearFrom: 2011, yearTo: null },
    { name: "CX-30", yearFrom: 2019, yearTo: null },
    { name: "CX-60", yearFrom: 2022, yearTo: null },
    { name: "MX-5", yearFrom: 1989, yearTo: null },
    { name: "RX-7", yearFrom: 1978, yearTo: 2002 },
    { name: "RX-8", yearFrom: 2003, yearTo: 2012 },
  ],
  "McLaren": [
    { name: "570S", yearFrom: 2015, yearTo: 2021 },
    { name: "600LT", yearFrom: 2018, yearTo: 2020 },
    { name: "720S", yearFrom: 2017, yearTo: null },
    { name: "765LT", yearFrom: 2020, yearTo: null },
    { name: "Artura", yearFrom: 2021, yearTo: null },
    { name: "GT", yearFrom: 2019, yearTo: null },
    { name: "P1", yearFrom: 2013, yearTo: 2015 },
    { name: "Senna", yearFrom: 2018, yearTo: 2019 },
    { name: "Speedtail", yearFrom: 2019, yearTo: 2020 },
  ],
  "Mercedes-Benz": [
    { name: "A-Class", yearFrom: 1997, yearTo: null },
    { name: "B-Class", yearFrom: 2005, yearTo: null },
    { name: "C-Class", yearFrom: 1993, yearTo: null },
    { name: "E-Class", yearFrom: 1984, yearTo: null },
    { name: "S-Class", yearFrom: 1972, yearTo: null },
    { name: "CLA", yearFrom: 2013, yearTo: null },
    { name: "CLS", yearFrom: 2004, yearTo: null },
    { name: "GLA", yearFrom: 2013, yearTo: null },
    { name: "GLB", yearFrom: 2019, yearTo: null },
    { name: "GLC", yearFrom: 2015, yearTo: null },
    { name: "GLE", yearFrom: 1997, yearTo: null },
    { name: "GLS", yearFrom: 2006, yearTo: null },
    { name: "G-Class", yearFrom: 1979, yearTo: null },
    { name: "SL", yearFrom: 1954, yearTo: null },
    { name: "SLK", yearFrom: 1996, yearTo: 2016 },
    { name: "AMG GT", yearFrom: 2014, yearTo: null },
    { name: "EQA", yearFrom: 2021, yearTo: null },
    { name: "EQB", yearFrom: 2021, yearTo: null },
    { name: "EQC", yearFrom: 2019, yearTo: null },
    { name: "EQE", yearFrom: 2022, yearTo: null },
    { name: "EQS", yearFrom: 2021, yearTo: null },
  ],
  "MINI": [
    { name: "Hatch", yearFrom: 2001, yearTo: null },
    { name: "Clubman", yearFrom: 2007, yearTo: null },
    { name: "Countryman", yearFrom: 2010, yearTo: null },
    { name: "Convertible", yearFrom: 2004, yearTo: null },
    { name: "Electric", yearFrom: 2020, yearTo: null },
  ],
  "Mitsubishi": [
    { name: "Mirage", yearFrom: 1978, yearTo: null },
    { name: "ASX", yearFrom: 2010, yearTo: null },
    { name: "Eclipse Cross", yearFrom: 2017, yearTo: null },
    { name: "Outlander", yearFrom: 2001, yearTo: null },
    { name: "Shogun", yearFrom: 1982, yearTo: 2021 },
    { name: "Lancer", yearFrom: 1973, yearTo: 2017 },
    { name: "Lancer Evolution", yearFrom: 1992, yearTo: 2016 },
  ],
  "Nissan": [
    { name: "Micra", yearFrom: 1982, yearTo: null },
    { name: "Note", yearFrom: 2004, yearTo: null },
    { name: "Juke", yearFrom: 2010, yearTo: null },
    { name: "Qashqai", yearFrom: 2006, yearTo: null },
    { name: "X-Trail", yearFrom: 2000, yearTo: null },
    { name: "Leaf", yearFrom: 2010, yearTo: null },
    { name: "Ariya", yearFrom: 2022, yearTo: null },
    { name: "GT-R", yearFrom: 1969, yearTo: null },
    { name: "370Z", yearFrom: 2008, yearTo: 2020 },
    { name: "Z", yearFrom: 2022, yearTo: null },
    { name: "Navara", yearFrom: 1985, yearTo: null },
  ],
  "Peugeot": [
    { name: "108", yearFrom: 2014, yearTo: 2021 },
    { name: "208", yearFrom: 2012, yearTo: null },
    { name: "308", yearFrom: 2007, yearTo: null },
    { name: "508", yearFrom: 2010, yearTo: null },
    { name: "2008", yearFrom: 2013, yearTo: null },
    { name: "3008", yearFrom: 2008, yearTo: null },
    { name: "5008", yearFrom: 2009, yearTo: null },
    { name: "e-208", yearFrom: 2019, yearTo: null },
  ],
  "Porsche": [
    { name: "911", yearFrom: 1963, yearTo: null },
    { name: "718 Boxster", yearFrom: 1996, yearTo: null },
    { name: "718 Cayman", yearFrom: 2005, yearTo: null },
    { name: "Taycan", yearFrom: 2019, yearTo: null },
    { name: "Panamera", yearFrom: 2009, yearTo: null },
    { name: "Macan", yearFrom: 2014, yearTo: null },
    { name: "Cayenne", yearFrom: 2002, yearTo: null },
    { name: "Carrera GT", yearFrom: 2003, yearTo: 2006 },
    { name: "918 Spyder", yearFrom: 2013, yearTo: 2015 },
  ],
  "Renault": [
    { name: "Clio", yearFrom: 1990, yearTo: null },
    { name: "Captur", yearFrom: 2013, yearTo: null },
    { name: "Megane", yearFrom: 1995, yearTo: null },
    { name: "Kadjar", yearFrom: 2015, yearTo: null },
    { name: "Koleos", yearFrom: 2007, yearTo: null },
    { name: "Zoe", yearFrom: 2012, yearTo: null },
    { name: "Twingo", yearFrom: 1992, yearTo: null },
  ],
  "Rolls-Royce": [
    { name: "Phantom", yearFrom: 1925, yearTo: null },
    { name: "Ghost", yearFrom: 2009, yearTo: null },
    { name: "Wraith", yearFrom: 1938, yearTo: null },
    { name: "Dawn", yearFrom: 2015, yearTo: null },
    { name: "Cullinan", yearFrom: 2018, yearTo: null },
    { name: "Spectre", yearFrom: 2023, yearTo: null },
  ],
  "SEAT": [
    { name: "Ibiza", yearFrom: 1984, yearTo: null },
    { name: "Leon", yearFrom: 1999, yearTo: null },
    { name: "Arona", yearFrom: 2017, yearTo: null },
    { name: "Ateca", yearFrom: 2016, yearTo: null },
    { name: "Tarraco", yearFrom: 2018, yearTo: null },
  ],
  "Skoda": [
    { name: "Fabia", yearFrom: 1999, yearTo: null },
    { name: "Scala", yearFrom: 2019, yearTo: null },
    { name: "Octavia", yearFrom: 1996, yearTo: null },
    { name: "Superb", yearFrom: 2001, yearTo: null },
    { name: "Kamiq", yearFrom: 2019, yearTo: null },
    { name: "Karoq", yearFrom: 2017, yearTo: null },
    { name: "Kodiaq", yearFrom: 2016, yearTo: null },
    { name: "Enyaq", yearFrom: 2021, yearTo: null },
  ],
  "Subaru": [
    { name: "Impreza", yearFrom: 1992, yearTo: null },
    { name: "WRX", yearFrom: 1992, yearTo: null },
    { name: "Forester", yearFrom: 1997, yearTo: null },
    { name: "Outback", yearFrom: 1994, yearTo: null },
    { name: "XV", yearFrom: 2011, yearTo: null },
    { name: "BRZ", yearFrom: 2012, yearTo: null },
  ],
  "Suzuki": [
    { name: "Swift", yearFrom: 1983, yearTo: null },
    { name: "Ignis", yearFrom: 2000, yearTo: null },
    { name: "Vitara", yearFrom: 1988, yearTo: null },
    { name: "S-Cross", yearFrom: 2013, yearTo: null },
    { name: "Jimny", yearFrom: 1970, yearTo: null },
  ],
  "Tesla": [
    { name: "Model S", yearFrom: 2012, yearTo: null },
    { name: "Model 3", yearFrom: 2017, yearTo: null },
    { name: "Model X", yearFrom: 2015, yearTo: null },
    { name: "Model Y", yearFrom: 2020, yearTo: null },
    { name: "Cybertruck", yearFrom: 2023, yearTo: null },
    { name: "Roadster", yearFrom: 2008, yearTo: 2012 },
  ],
  "Toyota": [
    { name: "Aygo", yearFrom: 2005, yearTo: 2022 },
    { name: "Aygo X", yearFrom: 2022, yearTo: null },
    { name: "Yaris", yearFrom: 1999, yearTo: null },
    { name: "Corolla", yearFrom: 1966, yearTo: null },
    { name: "Camry", yearFrom: 1982, yearTo: null },
    { name: "Prius", yearFrom: 1997, yearTo: null },
    { name: "C-HR", yearFrom: 2016, yearTo: null },
    { name: "RAV4", yearFrom: 1994, yearTo: null },
    { name: "Highlander", yearFrom: 2000, yearTo: null },
    { name: "Land Cruiser", yearFrom: 1951, yearTo: null },
    { name: "Supra", yearFrom: 1978, yearTo: null },
    { name: "GR86", yearFrom: 2021, yearTo: null },
    { name: "GT86", yearFrom: 2012, yearTo: 2021 },
    { name: "Hilux", yearFrom: 1968, yearTo: null },
    { name: "bZ4X", yearFrom: 2022, yearTo: null },
  ],
  "Vauxhall": [
    { name: "Corsa", yearFrom: 1982, yearTo: null },
    { name: "Astra", yearFrom: 1979, yearTo: null },
    { name: "Insignia", yearFrom: 2008, yearTo: null },
    { name: "Mokka", yearFrom: 2012, yearTo: null },
    { name: "Crossland", yearFrom: 2017, yearTo: null },
    { name: "Grandland", yearFrom: 2017, yearTo: null },
    { name: "Vivaro", yearFrom: 2001, yearTo: null },
  ],
  "Volkswagen": [
    { name: "up!", yearFrom: 2011, yearTo: null },
    { name: "Polo", yearFrom: 1975, yearTo: null },
    { name: "Golf", yearFrom: 1974, yearTo: null },
    { name: "Passat", yearFrom: 1973, yearTo: null },
    { name: "Arteon", yearFrom: 2017, yearTo: null },
    { name: "T-Roc", yearFrom: 2017, yearTo: null },
    { name: "Tiguan", yearFrom: 2007, yearTo: null },
    { name: "Touareg", yearFrom: 2002, yearTo: null },
    { name: "Touran", yearFrom: 2003, yearTo: null },
    { name: "Sharan", yearFrom: 1995, yearTo: 2022 },
    { name: "Golf R", yearFrom: 2009, yearTo: null },
    { name: "ID.3", yearFrom: 2020, yearTo: null },
    { name: "ID.4", yearFrom: 2020, yearTo: null },
    { name: "ID. Buzz", yearFrom: 2022, yearTo: null },
  ],
  "Volvo": [
    { name: "S60", yearFrom: 2000, yearTo: null },
    { name: "S90", yearFrom: 1996, yearTo: null },
    { name: "V40", yearFrom: 1995, yearTo: 2019 },
    { name: "V60", yearFrom: 2010, yearTo: null },
    { name: "V90", yearFrom: 1996, yearTo: null },
    { name: "XC40", yearFrom: 2017, yearTo: null },
    { name: "XC60", yearFrom: 2008, yearTo: null },
    { name: "XC90", yearFrom: 2002, yearTo: null },
    { name: "C40", yearFrom: 2021, yearTo: null },
  ],
};

// Helper to get all makes
export function getAllMakes(): string[] {
  return Object.keys(VEHICLE_DATABASE).sort();
}

// Helper to get models for a make
export function getModelsForMake(make: string): string[] {
  return VEHICLE_DATABASE[make]?.map(m => m.name) || [];
}

// Helper to get year range for a specific model
export function getYearRangeForModel(make: string, model: string): { min: number; max: number } {
  const makeData = VEHICLE_DATABASE[make];
  if (!makeData) return { min: 1990, max: new Date().getFullYear() };
  
  const modelData = makeData.find(m => m.name === model);
  if (!modelData) return { min: 1990, max: new Date().getFullYear() };
  
  return {
    min: modelData.yearFrom,
    max: modelData.yearTo || new Date().getFullYear()
  };
}

// Helper to generate year options for a model
export function getYearsForModel(make: string, model: string): number[] {
  const { min, max } = getYearRangeForModel(make, model);
  const years: number[] = [];
  for (let year = max; year >= min; year--) {
    years.push(year);
  }
  return years;
}

// Legacy compatibility - simple make/model array mapping
export const VEHICLES: Record<string, string[]> = Object.fromEntries(
  Object.entries(VEHICLE_DATABASE).map(([make, models]) => [
    make,
    models.map(m => m.name)
  ])
);

// Legacy YEARS export (generic year range)
export const YEARS: string[] = (() => {
  const arr: string[] = [];
  const end = new Date().getFullYear();
  for (let y = end; y >= 1960; y--) arr.push(String(y));
  return arr;
})();
