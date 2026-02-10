export interface FlightSchedule {
  id: string;
  flightNo: string;
  airline: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  aircraft: string;
  days: string;
  status: "Scheduled" | "Delayed" | "Cancelled" | "Completed";
  terminal: string;
}

export const sampleFlights: FlightSchedule[] = [
  { id: "1", flightNo: "MS701", airline: "EgyptAir", origin: "CAI", destination: "JFK", departure: "23:30", arrival: "05:15+1", aircraft: "B777-300ER", days: "Daily", status: "Scheduled", terminal: "T3" },
  { id: "2", flightNo: "MS702", airline: "EgyptAir", origin: "JFK", destination: "CAI", departure: "18:00", arrival: "12:30+1", aircraft: "B777-300ER", days: "Daily", status: "Scheduled", terminal: "T3" },
  { id: "3", flightNo: "MS785", airline: "EgyptAir", origin: "CAI", destination: "LHR", departure: "09:00", arrival: "13:15", aircraft: "A330-300", days: "Daily", status: "Scheduled", terminal: "T3" },
  { id: "4", flightNo: "MS786", airline: "EgyptAir", origin: "LHR", destination: "CAI", departure: "15:00", arrival: "22:30", aircraft: "A330-300", days: "Daily", status: "Delayed", terminal: "T3" },
  { id: "5", flightNo: "QR1301", airline: "Qatar Airways", origin: "DOH", destination: "CAI", departure: "08:45", arrival: "11:30", aircraft: "A350-1000", days: "Daily", status: "Scheduled", terminal: "T2" },
  { id: "6", flightNo: "QR1302", airline: "Qatar Airways", origin: "CAI", destination: "DOH", departure: "13:00", arrival: "17:15", aircraft: "A350-1000", days: "Daily", status: "Scheduled", terminal: "T2" },
  { id: "7", flightNo: "EK923", airline: "Emirates", origin: "DXB", destination: "CAI", departure: "03:45", arrival: "06:00", aircraft: "A380-800", days: "Mon,Wed,Fri,Sun", status: "Scheduled", terminal: "T2" },
  { id: "8", flightNo: "EK924", airline: "Emirates", origin: "CAI", destination: "DXB", departure: "08:00", arrival: "14:15", aircraft: "A380-800", days: "Mon,Wed,Fri,Sun", status: "Scheduled", terminal: "T2" },
  { id: "9", flightNo: "TK694", airline: "Turkish Airlines", origin: "IST", destination: "CAI", departure: "01:15", arrival: "03:30", aircraft: "B777-300ER", days: "Daily", status: "Completed", terminal: "T2" },
  { id: "10", flightNo: "TK695", airline: "Turkish Airlines", origin: "CAI", destination: "IST", departure: "04:30", arrival: "08:45", aircraft: "B777-300ER", days: "Daily", status: "Scheduled", terminal: "T2" },
  { id: "11", flightNo: "SV301", airline: "Saudia", origin: "JED", destination: "CAI", departure: "10:00", arrival: "12:30", aircraft: "B777-300ER", days: "Daily", status: "Scheduled", terminal: "T2" },
  { id: "12", flightNo: "SV302", airline: "Saudia", origin: "CAI", destination: "JED", departure: "14:00", arrival: "16:30", aircraft: "B777-300ER", days: "Daily", status: "Scheduled", terminal: "T2" },
  { id: "13", flightNo: "ET401", airline: "Ethiopian Airlines", origin: "ADD", destination: "CAI", departure: "06:30", arrival: "09:45", aircraft: "A350-900", days: "Tue,Thu,Sat", status: "Scheduled", terminal: "T2" },
  { id: "14", flightNo: "LH581", airline: "Lufthansa", origin: "FRA", destination: "CAI", departure: "22:15", arrival: "03:30+1", aircraft: "A330-300", days: "Daily", status: "Scheduled", terminal: "T2" },
  { id: "15", flightNo: "AF503", airline: "Air France", origin: "CDG", destination: "CAI", departure: "23:00", arrival: "04:15+1", aircraft: "A330-200", days: "Mon,Wed,Fri,Sat", status: "Cancelled", terminal: "T2" },
  { id: "16", flightNo: "BA155", airline: "British Airways", origin: "LHR", destination: "CAI", departure: "22:00", arrival: "04:30+1", aircraft: "A380-800", days: "Daily", status: "Scheduled", terminal: "T2" },
  { id: "17", flightNo: "RJ501", airline: "Royal Jordanian", origin: "AMM", destination: "CAI", departure: "07:00", arrival: "08:30", aircraft: "A321", days: "Daily", status: "Scheduled", terminal: "T2" },
  { id: "18", flightNo: "GF071", airline: "Gulf Air", origin: "BAH", destination: "CAI", departure: "09:30", arrival: "12:00", aircraft: "A321neo", days: "Tue,Thu,Sun", status: "Delayed", terminal: "T2" },
  { id: "19", flightNo: "MS401", airline: "EgyptAir", origin: "CAI", destination: "DXB", departure: "02:00", arrival: "07:00", aircraft: "B737-800", days: "Daily", status: "Scheduled", terminal: "T3" },
  { id: "20", flightNo: "J9251", airline: "Jazeera Airways", origin: "KWI", destination: "CAI", departure: "11:00", arrival: "13:30", aircraft: "A320neo", days: "Mon,Wed,Fri", status: "Scheduled", terminal: "T2" },
];
