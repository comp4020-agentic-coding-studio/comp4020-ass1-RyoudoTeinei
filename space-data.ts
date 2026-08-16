/**
 * The complete published CNS5 slice within 12 light-years of the Sun.
 *
 * The catalogue supplies ICRS directions and absolute trigonometric
 * parallaxes. Distances are derived from those parallaxes here, then the ICRS
 * direction is rotated into the J2000 mean-ecliptic frame. Keeping the
 * conversion in code makes every plotted vector reproducible from the source
 * columns below instead of relying on separately transcribed XYZ values.
 */

export const AU_PER_LIGHT_YEAR = 63_241.077_084_266_28;
export const LIGHT_YEAR_PER_AU = 1 / AU_PER_LIGHT_YEAR;
export const PARSEC_IN_LIGHT_YEARS = 3.261_563_777_167_433_3;

const J2000_MEAN_OBLIQUITY_DEG = 23.439_291_1;

export const CNS5_SOURCE = Object.freeze({
  title: "The Fifth Catalogue of Nearby Stars (CNS5)",
  catalogueId: "J/A+A/670/A19/cns5",
  sourceFile: "cns5.dat",
  edition: "corrected version, 13 December 2023",
  columns: "CNS5, GJ, Comp, NComp, RAJ2000, DEJ2000, Epoch, plx",
  selection: "all catalogue rows with parallax >= 271.7969814306194 mas (distance <= 12 ly)",
  subsetRecordCount: 28,
  coordinateFrame:
    "ICRS catalogue directions at each row's reference epoch; rotated to the J2000 mean ecliptic",
  distanceFormula: "distanceLy = (1000 / parallaxMas) * 3.2615637771674333",
  meanObliquityDeg: J2000_MEAN_OBLIQUITY_DEG,
  catalogueUrl:
    "https://vizier.cds.unistra.fr/viz-bin/VizieR?-source=J%2FA%2BA%2F670%2FA19",
  tapUrl: "https://tapvizier.cds.unistra.fr/TAPVizieR/tap",
  precisionMirrorUrl: "https://dc.g-vo.org/tableinfo/cns5.main",
  readmeUrl:
    "https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/J/A%2BA/670/A19?format=html&tex=true",
  doiUrl: "https://doi.org/10.1051/0004-6361/202244250",
} as const);

export type NearbyObjectKind =
  | "single-star"
  | "binary-star-system"
  | "multiple-star-system"
  | "brown-dwarf"
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
  readonly cns5Id: number;
  readonly id: string;
  readonly name: string;
  readonly gj: string;
  readonly component: string;
  readonly systemId: string;
  readonly kind: NearbyObjectKind;
  readonly shell: DistanceShell;
  readonly raDeg: number;
  readonly decDeg: number;
  readonly coordinateEpoch: number;
  readonly parallaxMas: number;
  readonly distanceLy: number;
  readonly eclipticLy: EclipticVectorLy;
  readonly eclipticAu: EclipticVectorAu;
}

export function lightYearsFromParallaxMas(parallaxMas: number): number {
  return (1000 / parallaxMas) * PARSEC_IN_LIGHT_YEARS;
}

export function icrsToJ2000EclipticLy(
  raDeg: number,
  decDeg: number,
  distanceLy: number,
): EclipticVectorLy {
  const radiansPerDegree = Math.PI / 180;
  const ra = raDeg * radiansPerDegree;
  const dec = decDeg * radiansPerDegree;
  const obliquity = J2000_MEAN_OBLIQUITY_DEG * radiansPerDegree;
  const equatorialX = distanceLy * Math.cos(dec) * Math.cos(ra);
  const equatorialY = distanceLy * Math.cos(dec) * Math.sin(ra);
  const equatorialZ = distanceLy * Math.sin(dec);

  return Object.freeze({
    x: equatorialX,
    y: Math.cos(obliquity) * equatorialY + Math.sin(obliquity) * equatorialZ,
    z: -Math.sin(obliquity) * equatorialY + Math.cos(obliquity) * equatorialZ,
  });
}

export function eclipticLyToAu(vector: EclipticVectorLy): EclipticVectorAu {
  return Object.freeze({
    x: vector.x * AU_PER_LIGHT_YEAR,
    y: vector.y * AU_PER_LIGHT_YEAR,
    z: vector.z * AU_PER_LIGHT_YEAR,
  });
}

type Cns5NearbyStarInput = Omit<
  Cns5NearbyStarRecord,
  "shell" | "distanceLy" | "eclipticLy" | "eclipticAu"
>;

function defineCns5Star(record: Cns5NearbyStarInput): Cns5NearbyStarRecord {
  const distanceLy = lightYearsFromParallaxMas(record.parallaxMas);
  const eclipticLy = icrsToJ2000EclipticLy(record.raDeg, record.decDeg, distanceLy);

  return Object.freeze({
    ...record,
    shell: distanceLy <= 10 ? "within-10-ly" : "10-to-12-ly",
    distanceLy,
    eclipticLy,
    eclipticAu: eclipticLyToAu(eclipticLy),
  });
}

export const CNS5_NEARBY_STARS: readonly Cns5NearbyStarRecord[] = Object.freeze([
  defineCns5Star({
    cns5Id: 3591,
    id: "proxima-centauri",
    name: "Proxima Centauri",
    gj: "551",
    component: "C",
    systemId: "alpha-centauri",
    kind: "single-star",
    raDeg: 217.392_321_472_008_83,
    decDeg: -62.676_075_116_766_66,
    coordinateEpoch: 2016,
    parallaxMas: 768.066_539_187_357_3,
  }),
  defineCns5Star({
    cns5Id: 3627,
    id: "alpha-centauri-ab",
    name: "Alpha Centauri A+B",
    gj: "559",
    component: "AB",
    systemId: "alpha-centauri",
    kind: "binary-star-system",
    raDeg: 219.920_408_130_102_8,
    decDeg: -60.835_145_218_974_98,
    coordinateEpoch: 1991.25,
    parallaxMas: 754.809_997_558_593_8,
  }),
  defineCns5Star({
    cns5Id: 4449,
    id: "barnards-star",
    name: "Barnard's Star",
    gj: "699",
    component: "",
    systemId: "barnards-star",
    kind: "single-star",
    raDeg: 269.448_502_525_438_36,
    decDeg: 4.739_420_051_112_412,
    coordinateEpoch: 2016,
    parallaxMas: 547.024_186_729_287_9,
  }),
  defineCns5Star({
    cns5Id: 2653,
    id: "luhman-16-ab",
    name: "Luhman 16 A+B",
    gj: "11551",
    component: "AB",
    systemId: "luhman-16",
    kind: "brown-dwarf-binary",
    raDeg: 162.314_706,
    decDeg: -53.318_384_7,
    coordinateEpoch: 2000,
    parallaxMas: 500.510_009_765_625,
  }),
  defineCns5Star({
    cns5Id: 2674,
    id: "wolf-359",
    name: "Wolf 359",
    gj: "406",
    component: "",
    systemId: "wolf-359",
    kind: "single-star",
    raDeg: 164.103_190_307_559_74,
    decDeg: 7.002_726_940_984_864,
    coordinateEpoch: 2016,
    parallaxMas: 415.179_415_678_021_37,
  }),
  defineCns5Star({
    cns5Id: 2696,
    id: "lalande-21185",
    name: "Lalande 21185",
    gj: "411",
    component: "",
    systemId: "lalande-21185",
    kind: "single-star",
    raDeg: 165.830_959_675_779_33,
    decDeg: 35.948_653_032_660_104,
    coordinateEpoch: 2016,
    parallaxMas: 392.784_297_437_213,
  }),
  defineCns5Star({
    cns5Id: 1676,
    id: "sirius-ab",
    name: "Sirius A+B",
    gj: "244",
    component: "A",
    systemId: "sirius",
    kind: "binary-star-system",
    raDeg: 101.288_541_052_066_4,
    decDeg: -16.713_143_062_644_765,
    coordinateEpoch: 1991.25,
    parallaxMas: 379.209_991_455_078_1,
  }),
  defineCns5Star({
    cns5Id: 4678,
    id: "ross-154",
    name: "Ross 154",
    gj: "729",
    component: "",
    systemId: "ross-154",
    kind: "single-star",
    raDeg: 282.458_789_017_522_2,
    decDeg: -23.837_097_448_727_12,
    coordinateEpoch: 2016,
    parallaxMas: 336.079_124_666_674,
  }),
  defineCns5Star({
    cns5Id: 905,
    id: "epsilon-eridani",
    name: "Epsilon Eridani",
    gj: "144.0",
    component: "",
    systemId: "epsilon-eridani",
    kind: "single-star",
    raDeg: 53.228_293_415_175_46,
    decDeg: -9.458_168_216_292_322,
    coordinateEpoch: 2016,
    parallaxMas: 310.577_292_800_582_1,
  }),
  defineCns5Star({
    cns5Id: 5217,
    id: "61-cygni-ab",
    name: "61 Cygni A+B",
    gj: "820",
    component: "A",
    systemId: "61-cygni",
    kind: "binary-star-system",
    raDeg: 316.748_479_294_000_4,
    decDeg: 38.763_862_446_497_97,
    coordinateEpoch: 2016,
    parallaxMas: 285.994_948_295_781_17,
  }),
  defineCns5Star({
    cns5Id: 1895,
    id: "procyon-ab",
    name: "Procyon A+B",
    gj: "280.0",
    component: "",
    systemId: "procyon",
    kind: "binary-star-system",
    raDeg: 114.827_242_018_087_22,
    decDeg: 5.227_507_577_481_227,
    coordinateEpoch: 1991.25,
    parallaxMas: 284.559_997_558_593_75,
  }),
  defineCns5Star({
    cns5Id: 448,
    id: "tau-ceti",
    name: "Tau Ceti",
    gj: "71.0",
    component: "",
    systemId: "tau-ceti",
    kind: "single-star",
    raDeg: 26.009_055_057_160_104,
    decDeg: -15.933_680_200_693_857,
    coordinateEpoch: 2016,
    parallaxMas: 273.959_991_455_078_1,
  }),
  defineCns5Star({
    cns5Id: 2194,
    id: "wise-0855-0714",
    name: "WISE 0855-0714",
    gj: "11286",
    component: "",
    systemId: "wise-0855-0714",
    kind: "brown-dwarf",
    raDeg: 133.794_759_8,
    decDeg: -7.245_145_6,
    coordinateEpoch: 2000,
    parallaxMas: 439,
  }),
  defineCns5Star({
    cns5Id: 1675,
    id: "sirius-b",
    name: "Sirius B",
    gj: "244",
    component: "B",
    systemId: "sirius",
    kind: "binary-star-system",
    raDeg: 101.286_625_520_992_49,
    decDeg: -16.720_932_526_023_173,
    coordinateEpoch: 2016,
    parallaxMas: 374.510_590_528_958_8,
  }),
  defineCns5Star({
    cns5Id: 425,
    id: "uv-ceti",
    name: "UV Ceti (Luyten 726-8 B)",
    gj: "65",
    component: "B",
    systemId: "luyten-726-8",
    kind: "binary-star-system",
    raDeg: 24.771_674_208_211_856,
    decDeg: -17.947_682_860_008_488,
    coordinateEpoch: 2016,
    parallaxMas: 373.844_312_268_399_2,
  }),
  defineCns5Star({
    cns5Id: 424,
    id: "bl-ceti",
    name: "BL Ceti (Luyten 726-8 A)",
    gj: "65",
    component: "A",
    systemId: "luyten-726-8",
    kind: "binary-star-system",
    raDeg: 24.771_554_293_454_546,
    decDeg: -17.948_299_887_129_313,
    coordinateEpoch: 2016,
    parallaxMas: 369.929_992_675_781_25,
  }),
  defineCns5Star({
    cns5Id: 5844,
    id: "ross-248",
    name: "Ross 248",
    gj: "905",
    component: "",
    systemId: "ross-248",
    kind: "single-star",
    raDeg: 355.480_015_258_155_9,
    decDeg: 44.170_375_700_747_755,
    coordinateEpoch: 2016,
    parallaxMas: 316.535_208_781_509_1,
  }),
  defineCns5Star({
    cns5Id: 5688,
    id: "lacaille-9352",
    name: "Lacaille 9352",
    gj: "887",
    component: "",
    systemId: "lacaille-9352",
    kind: "single-star",
    raDeg: 346.503_916_679_600_5,
    decDeg: -35.847_164_208_221_4,
    coordinateEpoch: 2016,
    parallaxMas: 304.162_651_199_691_6,
  }),
  defineCns5Star({
    cns5Id: 2890,
    id: "ross-128",
    name: "Ross 128",
    gj: "447",
    component: "",
    systemId: "ross-128",
    kind: "single-star",
    raDeg: 176.937_687_990_041_27,
    decDeg: 0.799_119_970_236_498_5,
    coordinateEpoch: 2016,
    parallaxMas: 296.362_680_912_385_6,
  }),
  defineCns5Star({
    cns5Id: 5586,
    id: "ez-aquarii-abc",
    name: "EZ Aquarii A+B+C",
    gj: "866",
    component: "ABC",
    systemId: "ez-aquarii",
    kind: "multiple-star-system",
    raDeg: 339.650_693_945,
    decDeg: -15.289_647_051_86,
    coordinateEpoch: 2016,
    parallaxMas: 293.6,
  }),
  defineCns5Star({
    cns5Id: 5218,
    id: "61-cygni-b",
    name: "61 Cygni B",
    gj: "820",
    component: "B",
    systemId: "61-cygni",
    kind: "binary-star-system",
    raDeg: 316.753_662_752_556,
    decDeg: 38.756_072_772_056_79,
    coordinateEpoch: 2016,
    parallaxMas: 286.005_351_861_648_5,
  }),
  defineCns5Star({
    cns5Id: 4633,
    id: "struve-2398-a",
    name: "Struve 2398 A",
    gj: "725",
    component: "A",
    systemId: "struve-2398",
    kind: "binary-star-system",
    raDeg: 280.683_070_835_228_9,
    decDeg: 59.638_357_907_754_816,
    coordinateEpoch: 2016,
    parallaxMas: 283.860_076_019_069,
  }),
  defineCns5Star({
    cns5Id: 4634,
    id: "struve-2398-b",
    name: "Struve 2398 B",
    gj: "725",
    component: "B",
    systemId: "struve-2398",
    kind: "binary-star-system",
    raDeg: 280.683_086_245_834_15,
    decDeg: 59.635_145_454_818_776,
    coordinateEpoch: 2016,
    parallaxMas: 283.859_115_844_578_47,
  }),
  defineCns5Star({
    cns5Id: 90,
    id: "groombridge-34-b",
    name: "Groombridge 34 B",
    gj: "15",
    component: "B",
    systemId: "groombridge-34",
    kind: "binary-star-system",
    raDeg: 4.625_300_681_217_554,
    decDeg: 44.028_744_516_643_57,
    coordinateEpoch: 2016,
    parallaxMas: 280.744_519_044_224_03,
  }),
  defineCns5Star({
    cns5Id: 89,
    id: "groombridge-34-a",
    name: "Groombridge 34 A",
    gj: "15",
    component: "A",
    systemId: "groombridge-34",
    kind: "binary-star-system",
    raDeg: 4.613_226_257_557_736,
    decDeg: 44.024_786_743_985_18,
    coordinateEpoch: 2016,
    parallaxMas: 280.741_126_577_938_1,
  }),
  defineCns5Star({
    cns5Id: 2093,
    id: "dx-cancri",
    name: "DX Cancri",
    gj: "1111",
    component: "",
    systemId: "dx-cancri",
    kind: "single-star",
    raDeg: 127.450_092_402_305_64,
    decDeg: 26.773_285_965_082_02,
    coordinateEpoch: 2016,
    parallaxMas: 279.259_627_100_932_8,
  }),
  defineCns5Star({
    cns5Id: 5449,
    id: "epsilon-indi-a",
    name: "Epsilon Indi A",
    gj: "845",
    component: "A",
    systemId: "epsilon-indi",
    kind: "binary-star-system",
    raDeg: 330.872_407_879_596_5,
    decDeg: -56.797_254_661_229_02,
    coordinateEpoch: 2016,
    parallaxMas: 274.843_141_521_629_6,
  }),
  defineCns5Star({
    cns5Id: 919,
    id: "gliese-1061",
    name: "Gliese 1061",
    gj: "1061",
    component: "",
    systemId: "gliese-1061",
    kind: "single-star",
    raDeg: 54.003_393_877_363_01,
    decDeg: -44.514_362_316_047_76,
    coordinateEpoch: 2016,
    parallaxMas: 272.188_900_831_498_53,
  }),
].sort((left, right) => left.distanceLy - right.distanceLy));
