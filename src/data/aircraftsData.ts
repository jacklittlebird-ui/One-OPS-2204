export interface Aircraft {
  id: string;
  registration: string;
  type: string;
  airline: string;
  model: string;
  mtow: number;
  seats: number;
  certificateNo: string;
  issueDate: string;
  status: "Operational" | "Maintenance" | "Grounded";
}

export const sampleAircrafts: Aircraft[] = [
  { id: "1", registration: "SU-GDM", type: "Wide Body", airline: "EgyptAir", model: "Boeing 777-300ER", mtow: 351.5, seats: 346, certificateNo: "EG-2012-001", issueDate: "2012-03-15", status: "Operational" },
  { id: "2", registration: "SU-GDN", type: "Wide Body", airline: "EgyptAir", model: "Boeing 777-300ER", mtow: 351.5, seats: 346, certificateNo: "EG-2013-002", issueDate: "2013-06-20", status: "Operational" },
  { id: "3", registration: "SU-GEK", type: "Narrow Body", airline: "EgyptAir", model: "Boeing 737-800", mtow: 79.0, seats: 154, certificateNo: "EG-2018-003", issueDate: "2018-01-10", status: "Operational" },
  { id: "4", registration: "SU-GEL", type: "Narrow Body", airline: "EgyptAir", model: "Boeing 737-800", mtow: 79.0, seats: 154, certificateNo: "EG-2019-004", issueDate: "2019-04-22", status: "Maintenance" },
  { id: "5", registration: "SU-GER", type: "Wide Body", airline: "EgyptAir", model: "Airbus A330-300", mtow: 242.0, seats: 301, certificateNo: "EG-2015-005", issueDate: "2015-09-05", status: "Operational" },
  { id: "6", registration: "A7-BEA", type: "Wide Body", airline: "Qatar Airways", model: "Boeing 777-300ER", mtow: 351.5, seats: 358, certificateNo: "QA-2014-006", issueDate: "2014-11-30", status: "Operational" },
  { id: "7", registration: "A7-ANA", type: "Wide Body", airline: "Qatar Airways", model: "Airbus A350-1000", mtow: 316.0, seats: 327, certificateNo: "QA-2020-007", issueDate: "2020-02-14", status: "Operational" },
  { id: "8", registration: "A6-EGA", type: "Super Heavy", airline: "Emirates", model: "Airbus A380-800", mtow: 575.0, seats: 489, certificateNo: "AE-2016-008", issueDate: "2016-07-18", status: "Operational" },
  { id: "9", registration: "A6-ENA", type: "Wide Body", airline: "Emirates", model: "Boeing 777-300ER", mtow: 351.5, seats: 354, certificateNo: "AE-2017-009", issueDate: "2017-05-25", status: "Operational" },
  { id: "10", registration: "TC-JJA", type: "Wide Body", airline: "Turkish Airlines", model: "Boeing 777-300ER", mtow: 351.5, seats: 349, certificateNo: "TR-2010-010", issueDate: "2010-08-12", status: "Operational" },
  { id: "11", registration: "TC-LJA", type: "Wide Body", airline: "Turkish Airlines", model: "Airbus A330-300", mtow: 242.0, seats: 289, certificateNo: "TR-2013-011", issueDate: "2013-12-01", status: "Maintenance" },
  { id: "12", registration: "D-AIMA", type: "Wide Body", airline: "Lufthansa", model: "Airbus A380-800", mtow: 575.0, seats: 509, certificateNo: "DE-2010-012", issueDate: "2010-10-08", status: "Grounded" },
  { id: "13", registration: "HZ-AK1", type: "Wide Body", airline: "Saudia", model: "Boeing 777-300ER", mtow: 351.5, seats: 342, certificateNo: "SA-2015-013", issueDate: "2015-03-20", status: "Operational" },
  { id: "14", registration: "ET-AVA", type: "Wide Body", airline: "Ethiopian Airlines", model: "Airbus A350-900", mtow: 280.0, seats: 315, certificateNo: "ET-2019-014", issueDate: "2019-06-15", status: "Operational" },
  { id: "15", registration: "G-XLEA", type: "Wide Body", airline: "British Airways", model: "Airbus A380-800", mtow: 575.0, seats: 469, certificateNo: "GB-2013-015", issueDate: "2013-09-28", status: "Operational" },
];
