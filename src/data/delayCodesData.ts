export interface DelayCode {
  id: string;
  code: string;
  category: string;
  description: string;
  responsible: "Airline" | "Airport" | "ATC" | "Weather" | "Handling" | "Security" | "Other";
  impactLevel: "Low" | "Medium" | "High";
  avgMinutes: number;
  active: boolean;
}

export const sampleDelayCodes: DelayCode[] = [
  // Airline
  { id: "DC01", code: "00", category: "Airline", description: "No delay / On-time departure", responsible: "Other", impactLevel: "Low", avgMinutes: 0, active: true },
  { id: "DC02", code: "01", category: "Airline", description: "Passenger check-in at departure gate", responsible: "Airline", impactLevel: "Low", avgMinutes: 8, active: true },
  { id: "DC03", code: "05", category: "Airline", description: "Flight plan – Late completion or change of flight documentation", responsible: "Airline", impactLevel: "Low", avgMinutes: 10, active: true },
  { id: "DC04", code: "06", category: "Airline", description: "Late completion of weight and balance documentation", responsible: "Airline", impactLevel: "Low", avgMinutes: 12, active: true },
  { id: "DC05", code: "09", category: "Airline", description: "Scheduled departure time re-allocated upon request of airline", responsible: "Airline", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC06", code: "11", category: "Airline", description: "Late check-in – Acceptance after deadline", responsible: "Airline", impactLevel: "Low", avgMinutes: 10, active: true },
  { id: "DC07", code: "12", category: "Airline", description: "Late check-in – Congestion at check-in area", responsible: "Airport", impactLevel: "Medium", avgMinutes: 15, active: true },
  { id: "DC08", code: "13", category: "Airline", description: "Check-in error – Weight/ticket discrepancy", responsible: "Airline", impactLevel: "Low", avgMinutes: 8, active: true },
  { id: "DC09", code: "14", category: "Airline", description: "Oversales – Booking error", responsible: "Airline", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC10", code: "15", category: "Airline", description: "Boarding – Discrepancy, pax count after boarding", responsible: "Airline", impactLevel: "Medium", avgMinutes: 18, active: true },
  { id: "DC11", code: "16", category: "Airline", description: "Commercial publicity/VIP – Passenger delaying departure", responsible: "Airline", impactLevel: "Low", avgMinutes: 12, active: true },
  { id: "DC12", code: "17", category: "Airline", description: "Catering order – Late or incorrect order", responsible: "Airline", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC13", code: "18", category: "Airline", description: "Baggage processing – Sorting/delivery", responsible: "Handling", impactLevel: "Medium", avgMinutes: 15, active: true },
  { id: "DC14", code: "19", category: "Airline", description: "Reduced mobility – Boarding assistance for PRM", responsible: "Airline", impactLevel: "Low", avgMinutes: 10, active: true },
  // Handling
  { id: "DC15", code: "31", category: "Handling", description: "Aircraft documentation late – Weight sheet / loadsheet", responsible: "Handling", impactLevel: "Medium", avgMinutes: 15, active: true },
  { id: "DC16", code: "32", category: "Handling", description: "Loading/unloading – Incorrect loading or sequence", responsible: "Handling", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC17", code: "33", category: "Handling", description: "Loading/unloading – Incomplete or late", responsible: "Handling", impactLevel: "High", avgMinutes: 30, active: true },
  { id: "DC18", code: "34", category: "Handling", description: "Loading/unloading – Baggage irregularity", responsible: "Handling", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC19", code: "35", category: "Handling", description: "Loading/unloading – Cargo irregularity", responsible: "Handling", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC20", code: "36", category: "Handling", description: "Aircraft cleaning – Delayed or incomplete", responsible: "Handling", impactLevel: "Low", avgMinutes: 12, active: true },
  { id: "DC21", code: "37", category: "Handling", description: "Catering – Late delivery or loading", responsible: "Handling", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC22", code: "38", category: "Handling", description: "ULD – Container or pallet unavailability or shortage", responsible: "Handling", impactLevel: "High", avgMinutes: 35, active: true },
  { id: "DC23", code: "39", category: "Handling", description: "Technical equipment – Ground equipment shortage or failure", responsible: "Handling", impactLevel: "High", avgMinutes: 40, active: true },
  // Technical / Maintenance
  { id: "DC24", code: "41", category: "Technical", description: "Aircraft defect – Discovered during transit check", responsible: "Airline", impactLevel: "High", avgMinutes: 60, active: true },
  { id: "DC25", code: "42", category: "Technical", description: "Scheduled maintenance – Overrun from hangar", responsible: "Airline", impactLevel: "High", avgMinutes: 90, active: true },
  { id: "DC26", code: "43", category: "Technical", description: "Non-scheduled maintenance – Special checks required", responsible: "Airline", impactLevel: "High", avgMinutes: 120, active: true },
  { id: "DC27", code: "44", category: "Technical", description: "Spares and maintenance – Awaiting parts", responsible: "Airline", impactLevel: "High", avgMinutes: 180, active: true },
  { id: "DC28", code: "45", category: "Technical", description: "AOG spares – Awaiting spares to be delivered", responsible: "Airline", impactLevel: "High", avgMinutes: 240, active: true },
  { id: "DC29", code: "46", category: "Technical", description: "Aircraft change – For technical reasons", responsible: "Airline", impactLevel: "High", avgMinutes: 60, active: true },
  // Cargo
  { id: "DC30", code: "51", category: "Cargo", description: "Cargo documentation – Late or inaccurate", responsible: "Handling", impactLevel: "Low", avgMinutes: 15, active: true },
  { id: "DC31", code: "52", category: "Cargo", description: "Cargo – Late positioning", responsible: "Handling", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC32", code: "53", category: "Cargo", description: "Cargo – Late acceptance", responsible: "Handling", impactLevel: "Medium", avgMinutes: 18, active: true },
  { id: "DC33", code: "55", category: "Cargo", description: "Cargo – Oversized cargo handling", responsible: "Handling", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC34", code: "57", category: "Cargo", description: "Cargo – Mail late delivery", responsible: "Other", impactLevel: "Low", avgMinutes: 10, active: true },
  // Security
  { id: "DC35", code: "21", category: "Security", description: "Passenger security – Additional screening required", responsible: "Security", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC36", code: "22", category: "Security", description: "Security – Baggage identification or reconciliation", responsible: "Security", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC37", code: "23", category: "Security", description: "Security – Bomb threat or unattended bag", responsible: "Security", impactLevel: "High", avgMinutes: 60, active: true },
  { id: "DC38", code: "24", category: "Security", description: "Security – Unauthorized access to restricted area", responsible: "Security", impactLevel: "High", avgMinutes: 45, active: true },
  // Weather
  { id: "DC39", code: "71", category: "Weather", description: "Departure station – Below landing/take-off minima", responsible: "Weather", impactLevel: "High", avgMinutes: 60, active: true },
  { id: "DC40", code: "72", category: "Weather", description: "Destination station – Below landing minima", responsible: "Weather", impactLevel: "High", avgMinutes: 45, active: true },
  { id: "DC41", code: "73", category: "Weather", description: "En-route weather – Turbulence or thunderstorm", responsible: "Weather", impactLevel: "Medium", avgMinutes: 30, active: true },
  { id: "DC42", code: "75", category: "Weather", description: "De-icing/Anti-icing – Aircraft treatment required", responsible: "Weather", impactLevel: "High", avgMinutes: 35, active: true },
  { id: "DC43", code: "76", category: "Weather", description: "Removal of snow/ice/water/sand from runway", responsible: "Airport", impactLevel: "High", avgMinutes: 40, active: true },
  { id: "DC44", code: "77", category: "Weather", description: "Ground handling impaired by adverse weather", responsible: "Weather", impactLevel: "Medium", avgMinutes: 25, active: true },
  // ATC / Airport
  { id: "DC45", code: "81", category: "ATC", description: "ATC – Mandatory slot or flow control restriction", responsible: "ATC", impactLevel: "High", avgMinutes: 45, active: true },
  { id: "DC46", code: "82", category: "ATC", description: "ATC – Airspace or route restriction", responsible: "ATC", impactLevel: "High", avgMinutes: 50, active: true },
  { id: "DC47", code: "83", category: "ATC", description: "ATC – Airport or runway closure", responsible: "ATC", impactLevel: "High", avgMinutes: 90, active: true },
  { id: "DC48", code: "85", category: "Airport", description: "Mandatory security – Government/immigration authority delay", responsible: "Airport", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC49", code: "86", category: "Airport", description: "Immigration/customs/health authority delay", responsible: "Airport", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC50", code: "87", category: "Airport", description: "Airport facility limitation – Gate, parking, taxi", responsible: "Airport", impactLevel: "Medium", avgMinutes: 30, active: true },
  { id: "DC51", code: "89", category: "ATC", description: "ATC start-up sequence – Delayed start-up or pushback", responsible: "ATC", impactLevel: "Medium", avgMinutes: 20, active: true },
  // Reactionary
  { id: "DC52", code: "91", category: "Reactionary", description: "Connecting flight – Late arrival of passengers/crew", responsible: "Airline", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC53", code: "92", category: "Reactionary", description: "Through check-in error – Missing connecting passengers", responsible: "Airline", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC54", code: "93", category: "Reactionary", description: "Late inbound aircraft – Aircraft arrived late from previous sector", responsible: "Airline", impactLevel: "High", avgMinutes: 45, active: true },
  { id: "DC55", code: "94", category: "Reactionary", description: "Cabin crew – Awaiting crew from incoming flight", responsible: "Airline", impactLevel: "High", avgMinutes: 40, active: true },
  { id: "DC56", code: "95", category: "Reactionary", description: "Crew – Awaiting crew from other transport", responsible: "Airline", impactLevel: "Medium", avgMinutes: 30, active: true },
  { id: "DC57", code: "96", category: "Reactionary", description: "Operations control – Crew re-assignment or substitution", responsible: "Airline", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC58", code: "99", category: "Miscellaneous", description: "Miscellaneous – Other delay not classified above", responsible: "Other", impactLevel: "Low", avgMinutes: 15, active: true },
];
