import type { CountryMap, Place, PostalAddress } from "../types/cv.d.ts";
import type { Target } from "../types/target.d.ts";
import { localize } from "./l10n.ts";

export interface PlaceContext {
  countries: CountryMap;
  lang: string;
  jobCountry?: string;
  foreignPlaceFormat: NonNullable<Target["foreignPlaceFormat"]>;
}

export function formatPlace(place: Place, context: PlaceContext): string {
  if (Array.isArray(place.country)) {
    return place.country.map((country) => countryName(country, context)).join(", ");
  }
  const locality =
    place.locality === undefined ? undefined : localize(place.locality, context.lang);
  return formatLocalizedPlace(locality, place.country, context);
}

/**
 * The locality and the country, whatever the job country, so that a reader or an ATS gets both.
 */
export function formatAddressPlace(address: PostalAddress, context: PlaceContext): string {
  return `${localize(address.locality, context.lang)}, ${countryName(address.country, context)}`;
}

export function countryName(country: string, context: PlaceContext): string {
  return localize(context.countries[country], context.lang);
}

/**
 * In the job country: the locality, or the country without locality. Abroad: according to
 * `foreignPlaceFormat`.
 */
function formatLocalizedPlace(
  locality: string | undefined,
  country: string,
  context: PlaceContext,
): string {
  const name = countryName(country, context);
  if (locality === undefined) return name;
  if (country === context.jobCountry) return locality;
  return context.foreignPlaceFormat === "localityAndCountry" ? `${locality}, ${name}` : name;
}
