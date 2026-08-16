/**
 * A deliberately small set of nearby catalogue anchors for the local-star map.
 *
 * Positions and parallaxes come from the corrected CNS5 catalogue. Distances
 * are derived from catalogue parallax; ecliptic coordinates are a rotation of
 * the catalogue ICRS direction into the J2000 mean ecliptic frame.
 */

export const AU_PER_LIGHT_YEAR = 63_241.077_084_266_28;
export const LIGHT_YEAR_PER_AU = 1 / AU_PER_LIGHT_YEAR;

export const CNS5_SOURCE = Object.freeze({
  title: "The Fifth Catalogue of Nearby Stars (CNS5)",
  catalogueId: "J/A+A/670/A19/cns5",
  edition: "corrected version, 13 December 2023",
  coordinateFrame: "ICRS catalogue positions; converted to the J2000 mean ecliptic",
  meanObliquityDeg: 23.439_291_1,
  catalogueUrl:
    "https://vizier.cds.unistra.fr/viz-bin/VizieR?-source=J%2FA%2BA%2F670%2FA19",
  readmeUrl:
    "https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/J/A%2BA/670/A19?format=html&tex=true",
  doiUrl: "https://doi.org/10.1051/0004-6361/202244250",
} as const);

export type NearbyObjectKind =
  | "single-star"
  | "binary-star-system"
  | "brown-dwarf-binary";

export type DistanceShell = "within-10-ly" | "10-to-12-ly";

export interface EclipticVectorLy {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface EclipticVectorAu {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Cns5NearbyStarRecord {
  readonly id: string;
  readonly name: string;
  readonly gj: string;
  readonly component: string;
  readonly systemId: string;
  readonly kind: NearbyObjectKind;
  readonly shell: DistanceShell;
  readonly raDeg: number;
  readonly decDeg: number;
  readonly parallaxMas: number;
  readonly distanceLy: number;
  readonly eclipticLy: EclipticVectorLy;
  readonly eclipticAu: EclipticVectorAu;
}

export function eclipticLyToAu(vector: EclipticVectorLy): EclipticVectorAu {
  return Object.freeze({
    x: vector.x * AU_PER_LIGHT_YEAR,
    y: vector.y * AU_PER_LIGHT_YEAR,
    z: vector.z * AU_PER_LIGHT_YEAR,
  });
}

type Cns5NearbyStarInput = Omit<Cns5NearbyStarRecord, "eclipticAu">;

function defineCns5Star(record: Cns5NearbyStarInput): Cns5NearbyStarRecord {
  const eclipticLy = Object.freeze({ ...record.eclipticLy });

  return Object.freeze({
    ...record,
    eclipticLy,
    eclipticAu: eclipticLyToAu(eclipticLy),
  });
}

export const CNS5_NEARBY_STARS: readonly Cns5NearbyStarRecord[] = Object.freeze([
  defineCns5Star({
    id: "proxima-centauri",
    name: "Proxima Centauri",
    gj: "551",
    component: "C",
    systemId: "alpha-centauri",
    kind: "single-star",
    shell: "within-10-ly",
    raDeg: 217.392_321,
    decDeg: -62.676_075,
    parallaxMas: 768.0665,
    distanceLy: 4.2465,
    eclipticLy: { x: -1.5486, y: -2.5867, z: -2.9905 },
  }),
  defineCns5Star({
    id: "alpha-centauri-ab",
    name: "Alpha Centauri A+B",
    gj: "559",
    component: "AB",
    systemId: "alpha-centauri",
    kind: "binary-star-system",
    shell: "within-10-ly",
    raDeg: 219.920_408,
    decDeg: -60.835_145,
    parallaxMas: 754.81,
    distanceLy: 4.321,
    eclipticLy: { x: -1.615, y: -2.7407, z: -2.9243 },
  }),
  defineCns5Star({
    id: "barnards-star",
    name: "Barnard's Star",
    gj: "699",
    component: "",
    systemId: "barnards-star",
    kind: "single-star",
    shell: "within-10-ly",
    raDeg: 269.448_503,
    decDeg: 4.739_42,
    parallaxMas: 547.0242,
    distanceLy: 5.9624,
    eclipticLy: { x: -0.0572, y: -5.2555, z: 2.8155 },
  }),
  defineCns5Star({
    id: "luhman-16-ab",
    name: "Luhman 16 A+B",
    gj: "11551",
    component: "AB",
    systemId: "luhman-16",
    kind: "brown-dwarf-binary",
    shell: "within-10-ly",
    raDeg: 162.314_706,
    decDeg: -53.318_385,
    parallaxMas: 500.51,
    distanceLy: 6.5165,
    eclipticLy: { x: -3.7088, y: -0.9938, z: -5.2652 },
  }),
  defineCns5Star({
    id: "wolf-359",
    name: "Wolf 359",
    gj: "406",
    component: "",
    systemId: "wolf-359",
    kind: "single-star",
    shell: "within-10-ly",
    raDeg: 164.103_19,
    decDeg: 7.002_727,
    parallaxMas: 415.1794,
    distanceLy: 7.8558,
    eclipticLy: { x: -7.499, y: 2.3404, z: 0.0292 },
  }),
  defineCns5Star({
    id: "lalande-21185",
    name: "Lalande 21185",
    gj: "411",
    component: "",
    systemId: "lalande-21185",
    kind: "single-star",
    shell: "within-10-ly",
    raDeg: 165.830_96,
    decDeg: 35.948_653,
    parallaxMas: 392.7843,
    distanceLy: 8.3037,
    eclipticLy: { x: -6.5177, y: 3.4488, z: 3.818 },
  }),
  defineCns5Star({
    id: "sirius-ab",
    name: "Sirius A+B",
    gj: "244",
    component: "A",
    systemId: "sirius",
    kind: "binary-star-system",
    shell: "within-10-ly",
    raDeg: 101.288_541,
    decDeg: -16.713_143,
    parallaxMas: 379.21,
    distanceLy: 8.6009,
    eclipticLy: { x: -1.6125, y: 6.4278, z: -5.4827 },
  }),
  defineCns5Star({
    id: "ross-154",
    name: "Ross 154",
    gj: "729",
    component: "",
    systemId: "ross-154",
    kind: "single-star",
    shell: "within-10-ly",
    raDeg: 282.458_789,
    decDeg: -23.837_097,
    parallaxMas: 336.0791,
    distanceLy: 9.7047,
    eclipticLy: { x: 1.9151, y: -9.5127, z: -0.1505 },
  }),
  defineCns5Star({
    id: "epsilon-eridani",
    name: "Epsilon Eridani",
    gj: "144.0",
    component: "",
    systemId: "epsilon-eridani",
    kind: "single-star",
    shell: "10-to-12-ly",
    raDeg: 53.228_293,
    decDeg: -9.458_168,
    parallaxMas: 310.5773,
    distanceLy: 10.5016,
    eclipticLy: { x: 6.2011, y: 6.9266, z: -4.8839 },
  }),
  defineCns5Star({
    id: "61-cygni-ab",
    name: "61 Cygni A+B",
    gj: "820",
    component: "A",
    systemId: "61-cygni",
    kind: "binary-star-system",
    shell: "10-to-12-ly",
    raDeg: 316.748_479,
    decDeg: 38.763_862,
    parallaxMas: 285.9949,
    distanceLy: 11.4043,
    eclipticLy: { x: 6.4767, y: -2.75, z: 8.9748 },
  }),
  defineCns5Star({
    id: "procyon-ab",
    name: "Procyon A+B",
    gj: "280.0",
    component: "",
    systemId: "procyon",
    kind: "binary-star-system",
    shell: "10-to-12-ly",
    raDeg: 114.827_242,
    decDeg: 5.227_508,
    parallaxMas: 284.56,
    distanceLy: 11.4618,
    eclipticLy: { x: -4.7926, y: 9.9198, z: -3.1625 },
  }),
  defineCns5Star({
    id: "tau-ceti",
    name: "Tau Ceti",
    gj: "71.0",
    component: "",
    systemId: "tau-ceti",
    kind: "single-star",
    shell: "10-to-12-ly",
    raDeg: 26.009_055,
    decDeg: -15.933_68,
    parallaxMas: 273.96,
    distanceLy: 11.9053,
    eclipticLy: { x: 10.2885, y: 3.3057, z: -4.9954 },
  }),
]);
