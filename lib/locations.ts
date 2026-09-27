import { Country, State, City } from "country-state-city";

export interface CountryOption {
  name: string;
  isoCode: string;
  flag: string;
}

export interface StateOption {
  name: string;
  isoCode: string;
  countryCode: string;
}

export interface CityOption {
  name: string;
  stateCode: string;
  countryCode: string;
}

/**
 * Returns all countries sorted alphabetically by name.
 */
export function getAlphabeticalCountries(): CountryOption[] {
  const countries = Country.getAllCountries();
  return countries
    .map((c) => ({
      name: c.name,
      isoCode: c.isoCode,
      flag: c.flag,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns all states of a given country (by isoCode or country name),
 * sorted alphabetically by state name.
 */
export function getAlphabeticalStates(countryIdentifier: string): StateOption[] {
  if (!countryIdentifier) return [];

  // Check if identifier is an ISO code (2 letters) or name
  let country = Country.getCountryByCode(countryIdentifier.toUpperCase());
  if (!country) {
    // Attempt lookup by name
    const all = Country.getAllCountries();
    country = all.find(
      (c) => c.name.toLowerCase() === countryIdentifier.trim().toLowerCase()
    );
  }

  const isoCode = country ? country.isoCode : countryIdentifier.toUpperCase();
  const states = State.getStatesOfCountry(isoCode);

  return states
    .map((s) => ({
      name: s.name,
      isoCode: s.isoCode,
      countryCode: s.countryCode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns all cities of a given country and state,
 * sorted alphabetically by city name.
 */
export function getAlphabeticalCities(
  countryIdentifier: string,
  stateIdentifier: string
): CityOption[] {
  if (!countryIdentifier || !stateIdentifier) return [];

  // Resolve country ISO code
  let country = Country.getCountryByCode(countryIdentifier.toUpperCase());
  if (!country) {
    const all = Country.getAllCountries();
    country = all.find(
      (c) => c.name.toLowerCase() === countryIdentifier.trim().toLowerCase()
    );
  }
  const countryCode = country ? country.isoCode : countryIdentifier.toUpperCase();

  // Resolve state ISO code
  const states = State.getStatesOfCountry(countryCode);
  let state = states.find(
    (s) => s.isoCode.toUpperCase() === stateIdentifier.toUpperCase()
  );
  if (!state) {
    state = states.find(
      (s) => s.name.toLowerCase() === stateIdentifier.trim().toLowerCase()
    );
  }
  const stateCode = state ? state.isoCode : stateIdentifier;

  const cities = City.getCitiesOfState(countryCode, stateCode);
  if (!cities || cities.length === 0) return [];

  // Deduplicate and sort alphabetically
  const uniqueNames = new Set<string>();
  const result: CityOption[] = [];

  for (const c of cities) {
    if (!uniqueNames.has(c.name)) {
      uniqueNames.add(c.name);
      result.push({
        name: c.name,
        stateCode: c.stateCode,
        countryCode: c.countryCode,
      });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
