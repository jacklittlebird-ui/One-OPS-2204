export interface Aircraft {
  id: string;
  registration: string;
  type: string;
  airline: string;
  model: string;
  mtow: number;
  seats: number;
  yearBuilt: number;
  status: "Operational" | "Maintenance" | "Grounded";
}

export const sampleAircrafts: Aircraft[] = [
  { id: "1", registration: "SU-GDM", type: "Wide Body", airline: "EgyptAir", model: "Boeing 777-300ER", mtow: 351500, seats: 346, yearBuilt: 2012, status: "Operational" },
  { id: "2", registration: "SU-GDN", type: "Wide Body", airline: "EgyptAir", model: "Boeing 777-300ER", mtow: 351500, seats: 346, yearBuilt: 2013, status: "Operational" },
  { id: "3", registration: "SU-GEK", type: "Narrow Body", airline: "EgyptAir", model: "Boeing 737-800", mtow: 79016, seats: 154, yearBuilt: 2018, status: "Operational" },
  { id: "4", registration: "SU-GEL", type: "Narrow Body", airline: "EgyptAir", model: "Boeing 737-800", mtow: 79016, seats: 154, yearBuilt: 2019, status: "Maintenance" },
  { id: "5", registration: "SU-GER", type: "Wide Body", airline: "EgyptAir", model: "Airbus A330-300", mtow: 242000, seats: 301, yearBuilt: 2015, status: "Operational" },
  { id: "6", registration: "A7-BEA", type: "Wide Body", airline: "Qatar Airways", model: "Boeing 777-300ER", mtow: 351500, seats: 358, yearBuilt: 2014, status: "Operational" },
  { id: "7", registration: "A7-ANA", type: "Wide Body", airline: "Qatar Airways", model: "Airbus A350-1000", mtow: 316000, seats: 327, yearBuilt: 2020, status: "Operational" },
  { id: "8", registration: "A6-EGA", type: "Super Heavy", airline: "Emirates", model: "Airbus A380-800", mtow: 575000, seats: 489, yearBuilt: 2016, status: "Operational" },
  { id: "9", registration: "A6-ENA", type: "Wide Body", airline: "Emirates", model: "Boeing 777-300ER", mtow: 351500, seats: 354, yearBuilt: 2017, status: "Operational" },
  { id: "10", registration: "TC-JJA", type: "Wide Body", airline: "Turkish Airlines", model: "Boeing 777-300ER", mtow: 351500, seats: 349, yearBuilt: 2010, status: "Operational" },
  { id: "11", registration: "TC-LJA", type: "Wide Body", airline: "Turkish Airlines", model: "Airbus A330-300", mtow: 242000, seats: 289, yearBuilt: 2013, status: "Maintenance" },
  { id: "12", registration: "D-AIMA", type: "Wide Body", airline: "Lufthansa", model: "Airbus A380-800", mtow: 575000, seats: 509, yearBuilt: 2010, status: "Grounded" },
  { id: "13", registration: "HZ-AK1", type: "Wide Body", airline: "Saudia", model: "Boeing 777-300ER", mtow: 351500, seats: 342, yearBuilt: 2015, status: "Operational" },
  { id: "14", registration: "ET-AVA", type: "Wide Body", airline: "Ethiopian Airlines", model: "Airbus A350-900", mtow: 280000, seats: 315, yearBuilt: 2019, status: "Operational" },
  { id: "15", registration: "G-XLEA", type: "Wide Body", airline: "British Airways", model: "Airbus A380-800", mtow: 575000, seats: 469, yearBuilt: 2013, status: "Operational" },
];
