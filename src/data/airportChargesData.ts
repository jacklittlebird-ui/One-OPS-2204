export interface AirportCharge {
  id: string;
  vendorName: string;
  mtow: string;
  landingDay: number;
  landingNight: number;
  parkingDay: number;
  parkingNight: number;
  housing: number;
  airNavigation: number;
}

interface VendorConfig {
  name: string;
  maxTon: number;
  airNav: number;
  calc: (ton: number) => Omit<AirportCharge, 'id' | 'vendorName' | 'mtow' | 'airNavigation'>;
}

function cairoCalc(ton: number) {
  let landingDay: number, landingNight: number, parkingDay: number, parkingNight: number, housing: number;

  if (ton <= 18) {
    landingDay = 64.87; landingNight = 77.87;
  } else if (ton <= 25) {
    landingDay = 64.87 + (ton - 18) * 3.42; landingNight = 77.87 + (ton - 18) * 4.3;
  } else if (ton <= 100) {
    landingDay = 135.2 + (ton - 26) * 5.2; landingNight = 169 + (ton - 26) * 6.5;
  } else {
    landingDay = 710.33 + (ton - 101) * 7.03; landingNight = 887.59 + (ton - 101) * 8.79;
  }

  parkingDay = ton <= 81 ? 31.14 : 31.14 + (ton - 81) * 0.33;
  parkingNight = ton <= 62 ? 31.14 : 31.14 + (ton - 62) * 0.41;
  housing = ton <= 8 ? 62.28 : 62.28 + (ton - 8) * 6.96;

  return { landingDay: +landingDay.toFixed(2), landingNight: +landingNight.toFixed(2), parkingDay: +parkingDay.toFixed(2), parkingNight: +parkingNight.toFixed(2), housing: +housing.toFixed(2) };
}

function egyptianCalc(ton: number) {
  let landingDay: number, landingNight: number;

  if (ton <= 18) {
    landingDay = 33.1; landingNight = 39.68;
  } else if (ton <= 25) {
    landingDay = 33.1 + (ton - 18) * 1.82; landingNight = 39.68 + (ton - 18) * 2.27;
  } else if (ton <= 100) {
    landingDay = 72.28 + (ton - 26) * 2.78; landingNight = 90.48 + (ton - 26) * 3.48;
  } else {
    landingDay = 378.72 + (ton - 101) * 3.72; landingNight = 473.52 + (ton - 101) * 4.64;
  }

  const parkingDay = ton <= 81 ? 19.84 : 19.84 + (ton - 81) * 0.18;
  const parkingNight = ton <= 62 ? 19.84 : 19.84 + (ton - 62) * 0.22;
  const housing = ton <= 8 ? 39.68 : 39.68 + (ton - 8) * 4.65;

  return { landingDay: +landingDay.toFixed(2), landingNight: +landingNight.toFixed(2), parkingDay: +parkingDay.toFixed(2), parkingNight: +parkingNight.toFixed(2), housing: +housing.toFixed(2) };
}

function emaasCalc(ton: number) {
  return {
    landingDay: +(9.2 * ton).toFixed(2),
    landingNight: +(11.5 * ton).toFixed(2),
    parkingDay: +(0.86 * ton).toFixed(2),
    parkingNight: +(1.08 * ton).toFixed(2),
    housing: +(2.3 * ton).toFixed(2),
  };
}

const vendors: VendorConfig[] = [
  { name: "Cairo Airport Company", maxTon: 600, airNav: 0, calc: cairoCalc },
  { name: "Egyptian Airports", maxTon: 600, airNav: 0, calc: egyptianCalc },
  { name: "EMAAS", maxTon: 600, airNav: 500, calc: emaasCalc },
];

export function generateAllCharges(): AirportCharge[] {
  const charges: AirportCharge[] = [];
  let id = 1;
  for (const vendor of vendors) {
    for (let ton = 1; ton <= vendor.maxTon; ton++) {
      const c = vendor.calc(ton);
      let airNav = vendor.airNav;
      if (vendor.name === "EMAAS" && ton > 200) airNav = 600;
      if (vendor.name === "EMAAS" && ton > 400) airNav = 700;
      if (vendor.name === "EMAAS" && ton > 500) airNav = 800;
      charges.push({
        id: String(id++),
        vendorName: vendor.name,
        mtow: `${ton} TON`,
        airNavigation: airNav,
        ...c,
      });
    }
  }
  return charges;
}

export function getUniqueVendors(data: AirportCharge[]): string[] {
  return [...new Set(data.map(d => d.vendorName))];
}

export function getUniqueMTOW(data: AirportCharge[]): string[] {
  const mtows = [...new Set(data.map(d => d.mtow))];
  return mtows.sort((a, b) => parseInt(a) - parseInt(b));
}
