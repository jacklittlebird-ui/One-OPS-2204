export interface Airline {
  id: string;
  code: string;
  name: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive" | "Suspended";
}

export const sampleAirlines: Airline[] = [
  { id: "1", code: "MS", name: "EgyptAir", country: "Egypt", contactPerson: "Ahmed Hassan", email: "ops@egyptair.com", phone: "+20-2-2696-0011", status: "Active" },
  { id: "2", code: "QR", name: "Qatar Airways", country: "Qatar", contactPerson: "Ali Al-Thani", email: "ops@qatarairways.com", phone: "+974-4449-6666", status: "Active" },
  { id: "3", code: "EK", name: "Emirates", country: "UAE", contactPerson: "Fatima Al-Maktoum", email: "ops@emirates.com", phone: "+971-4-214-4444", status: "Active" },
  { id: "4", code: "SV", name: "Saudia", country: "Saudi Arabia", contactPerson: "Khalid Al-Saud", email: "ops@saudia.com", phone: "+966-1-686-0000", status: "Active" },
  { id: "5", code: "ET", name: "Ethiopian Airlines", country: "Ethiopia", contactPerson: "Tewolde GebreMariam", email: "ops@ethiopianairlines.com", phone: "+251-11-665-6666", status: "Active" },
  { id: "6", code: "TK", name: "Turkish Airlines", country: "Turkey", contactPerson: "Mehmet Yilmaz", email: "ops@thy.com", phone: "+90-212-444-0849", status: "Active" },
  { id: "7", code: "LH", name: "Lufthansa", country: "Germany", contactPerson: "Hans Mueller", email: "ops@lufthansa.com", phone: "+49-69-696-0", status: "Active" },
  { id: "8", code: "AF", name: "Air France", country: "France", contactPerson: "Pierre Dupont", email: "ops@airfrance.com", phone: "+33-1-4156-7890", status: "Active" },
  { id: "9", code: "BA", name: "British Airways", country: "UK", contactPerson: "James Smith", email: "ops@ba.com", phone: "+44-20-8738-5050", status: "Active" },
  { id: "10", code: "RJ", name: "Royal Jordanian", country: "Jordan", contactPerson: "Omar Nasser", email: "ops@rj.com", phone: "+962-6-520-0000", status: "Active" },
  { id: "11", code: "GF", name: "Gulf Air", country: "Bahrain", contactPerson: "Yusuf Al-Khalifa", email: "ops@gulfair.com", phone: "+973-1733-8888", status: "Active" },
  { id: "12", code: "KU", name: "Kuwait Airways", country: "Kuwait", contactPerson: "Nasser Al-Sabah", email: "ops@kuwaitairways.com", phone: "+965-2243-4444", status: "Inactive" },
  { id: "13", code: "WY", name: "Oman Air", country: "Oman", contactPerson: "Said Al-Busaidi", email: "ops@omanair.com", phone: "+968-2453-1111", status: "Active" },
  { id: "14", code: "NE", name: "Nesma Airlines", country: "Egypt", contactPerson: "Mohamed Naguib", email: "ops@nesmaairlines.com", phone: "+20-2-2269-9999", status: "Suspended" },
  { id: "15", code: "J9", name: "Jazeera Airways", country: "Kuwait", contactPerson: "Marwan Boodai", email: "ops@jazeeraairways.com", phone: "+965-1777-1111", status: "Active" },
];
