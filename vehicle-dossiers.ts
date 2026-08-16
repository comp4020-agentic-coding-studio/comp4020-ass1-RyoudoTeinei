import apollo10Src from "./assets/vehicles/apollo-10.jpg";
import boeing737Src from "./assets/vehicles/boeing-737.jpg";
import concordeSrc from "./assets/vehicles/concorde.jpg";
import daedalusSrc from "./assets/vehicles/daedalus.jpg";
import darkForestSrc from "./assets/vehicles/dark-forest.jpg";
import discoverySrc from "./assets/vehicles/discovery-one.jpg";
import enterpriseSrc from "./assets/vehicles/enterprise.jpg";
import f1Src from "./assets/vehicles/f1.jpg";
import falconSrc from "./assets/vehicles/millennium-falcon.jpg";
import orionSrc from "./assets/vehicles/orion.jpg";
import parkerSrc from "./assets/vehicles/parker.jpg";
import starshotSrc from "./assets/vehicles/starshot.jpg";
import voyagerSrc from "./assets/vehicles/voyager.png";
import wanderingEarthSrc from "./assets/vehicles/wandering-earth.jpg";
import warhammerSrc from "./assets/vehicles/warhammer.jpg";

export type VehicleMediaKind =
  | "mission photograph"
  | "vehicle photograph"
  | "concept illustration"
  | "publisher cover"
  | "licensed replica"
  | "official franchise artwork";

export interface VehicleMedia {
  src: string;
  alt: string;
  kind: VehicleMediaKind;
  credit: string;
  sourceUrl: string;
  license?: string;
}

export interface VehicleDossier {
  vehicleId: string;
  media: VehicleMedia;
  facts: readonly string[];
  missionSummary: string;
  canonicalNote: string;
}

export const VEHICLE_DOSSIERS: Record<string, VehicleDossier> = {
  voyager: {
    vehicleId: "voyager",
    media: {
      src: voyagerSrc,
      alt: "Voyager spacecraft isolated in profile with its large white dish antenna",
      kind: "concept illustration",
      credit: "Courtesy NASA/JPL-Caltech",
      sourceUrl: "https://www.jpl.nasa.gov/missions/voyager-1/",
      license: "NASA/JPL-Caltech media-use terms",
    },
    facts: [
      "Launched from Cape Canaveral on 5 September 1977.",
      "Jupiter and Saturn encounters supplied the flown gravity-assist route.",
      "Crossed the heliopause in August 2012.",
      "Its radio signal remains the only connection to the spacecraft.",
    ],
    missionSummary: "Voyager 1 launched in 1977 to explore Jupiter and Saturn, using gravity assists and a rare planetary alignment to continue toward the outer Solar System. After transforming our view of both giant planets, it became the first spacecraft to cross the heliopause and still returns data from interstellar space.",
    canonicalNote: "Any line after the measured endpoint is a constant-speed distance comparison along Voyager's outbound heading; Voyager is not aimed at Proxima Centauri.",
  },
  f1: {
    vehicleId: "f1",
    media: {
      src: f1Src,
      alt: "A white and red 2006 Honda Formula One car displayed at a motor show",
      kind: "vehicle photograph",
      credit: "Semnoz / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2006_SAG_-_F1_Honda_2006_-01.JPG",
      license: "CC BY-SA 3.0",
    },
    facts: [
      "Honda's RA106 programme set a 397.36 km/h FIA land-speed record at Bonneville.",
      "The photographed 2006 Honda is representative of that Formula One programme.",
      "An F1 car has no propulsion, life support, or thermal control for space.",
    ],
    missionSummary: "Honda's RA106 was built for the 2006 Formula One season around a high-revving V8 engine, extreme aerodynamic downforce and minimum possible mass. A modified car from the programme later reached 397.36 km/h at Bonneville, setting the FIA speed record used here.",
    canonicalNote: "This is an openly impossible constant-speed comparison, not a proposed spacecraft trajectory.",
  },
  "737": {
    vehicleId: "737",
    media: {
      src: boeing737Src,
      alt: "Boeing 737 MAX 8 airliner seen from the front-left on an airport apron",
      kind: "vehicle photograph",
      credit: "Vsbraga / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Boeing_737_MAX_8.jpg",
      license: "CC0 1.0",
    },
    facts: [
      "The 737-8 is a short- to medium-range twin-engine airliner.",
      "Mach 0.79 is a representative cruise speed, about 839 km/h at altitude.",
      "Its turbofan engines require an atmosphere and cannot operate as space drives.",
    ],
    missionSummary: "The Boeing 737 is a twin-engine narrow-body airliner designed to move passengers efficiently across short- and medium-range routes. The 737-8 typically cruises near Mach 0.79, combining swept wings, high-bypass turbofans and airline-scale carrying capacity.",
    canonicalNote: "No Boeing mission or performance claim supports vacuum travel; the route is a scale analogy only.",
  },
  concorde: {
    vehicleId: "concorde",
    media: {
      src: concordeSrc,
      alt: "Retired white Concorde supersonic airliner in side view at Brooklands Museum",
      kind: "vehicle photograph",
      credit: "Rob Farrow / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Brooklands_-_Concorde_-_Side_view_-_geograph.org.uk_-_7121355.jpg",
      license: "CC BY-SA 2.0",
    },
    facts: [
      "Concorde carried passengers across the Atlantic at about Mach 2.",
      "Its quoted maximum cruise speed is approximately 2,179 km/h.",
      "Four Olympus turbojets depended on atmospheric oxygen.",
    ],
    missionSummary: "Concorde was an Anglo-French supersonic passenger airliner created to cross oceans in roughly half the time of conventional jets. Its slender delta wing, movable nose and four Olympus engines sustained passenger service at about Mach 2 until retirement in 2003.",
    canonicalNote: "The aircraft never flew in space; this is a counterfactual speed ruler, not an engineering proposal.",
  },
  apollo10: {
    vehicleId: "apollo10",
    media: {
      src: apollo10Src,
      alt: "Apollo 10 command and service module photographed above the Moon in May 1969",
      kind: "mission photograph",
      credit: "NASA",
      sourceUrl: "https://www.nasa.gov/gallery/apollo-10/",
      license: "NASA image",
    },
    facts: [
      "Launched on 18 May 1969 as the full dress rehearsal for Apollo 11.",
      "The lunar module descended to about 15.6 kilometres above the Moon.",
      "The crew reached roughly 39,897 km/h while returning to Earth.",
      "That record was a brief re-entry peak, not a sustainable cruise speed.",
    ],
    missionSummary: "Apollo 10 was the May 1969 full-dress rehearsal for the first Moon landing, testing the command module, lunar module, navigation and mission procedures in lunar orbit. Its crew descended to within about 15.6 kilometres of the surface and reached the highest speed ever recorded for humans on the return to Earth.",
    canonicalNote: "Apollo 10's record velocity came from falling toward Earth. Redirecting and sustaining it is a counterfactual discontinuity.",
  },
  parker: {
    vehicleId: "parker",
    media: {
      src: parkerSrc,
      alt: "Parker Solar Probe in a clean room before launch with its heat shield visible",
      kind: "mission photograph",
      credit: "NASA / Johns Hopkins APL / Ed Whitman",
      sourceUrl: "https://svs.gsfc.nasa.gov/12997/",
      license: "NASA image",
    },
    facts: [
      "Launched on 12 August 2018 to study the Sun's outer atmosphere.",
      "Seven planned Venus flybys progressively lower the solar orbit.",
      "Its speed record occurs near perihelion while falling through the Sun's gravity well.",
      "The spacecraft remains in a bound solar orbit.",
    ],
    missionSummary: "Parker Solar Probe launched in 2018 to fly through the Sun's corona and investigate how the solar wind and energetic particles are produced. Repeated Venus gravity assists shrink its orbit, carrying its heat-shielded instruments closer to the Sun and faster than any previous spacecraft.",
    canonicalNote: "Parker has no outward escape chapter. A frozen-peak-speed branch, if shown, must be visibly separated as an impossible comparison.",
  },
  daedalus: {
    vehicleId: "daedalus",
    media: {
      src: daedalusSrc,
      alt: "Colour rendering of Project Daedalus under fusion-pulse thrust beside a distant planet",
      kind: "concept illustration",
      credit: "Joe Bergeron / Project Icarus gallery",
      sourceUrl: "https://icarusinterstellar.wordpress.com/gallery/",
      license: "© Joe Bergeron · gallery lists permission as pending",
    },
    facts: [
      "The British Interplanetary Society study ran from 1973 to 1978.",
      "Two uncrewed fusion-pulse stages were designed for a 3.8-year boost.",
      "The reference destination was Barnard's Star, not Proxima Centauri.",
      "The study planned a high-speed flyby with no arrival braking.",
    ],
    missionSummary: "Project Daedalus was a 1973–1978 British Interplanetary Society study asking whether an uncrewed probe could reach Barnard's Star within fifty years using credible near-future technology. Its enormous two-stage craft would fire electron-beam-triggered fusion pellets for a 3.8-year boost, coast at more than 12 percent of light speed, and fly past the star without braking.",
    canonicalNote: "Daedalus was a detailed design study, never a built vehicle; the Proxima endpoint is this explainer's adaptation.",
  },
  starshot: {
    vehicleId: "starshot",
    media: {
      src: starshotSrc,
      alt: "Artist's concept of a laser beam pushing a reflective lightsail away from Earth",
      kind: "concept illustration",
      credit: "Kevin M. Gill / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Laser_Sail_(25259478171).png",
      license: "CC BY 2.0",
    },
    facts: [
      "Breakthrough Starshot studies gram-scale cameras attached to metre-scale sails.",
      "A ground-based laser array would accelerate each sail for only minutes.",
      "The headline cruise target is about 20 percent of light speed.",
      "The concept has no arrival braking stage.",
    ],
    missionSummary: "Breakthrough Starshot studies whether gram-scale camera probes on reflective lightsails could be driven toward Alpha Centauri by a powerful ground-based laser array. A minutes-long boost to roughly twenty percent of light speed could permit an uncrewed flyby within about twenty years, with no planned arrival braking.",
    canonicalNote: "The image is a CC-licensed laser-sail concept, not a photograph of built Starshot hardware.",
  },
  orion: {
    vehicleId: "orion",
    media: {
      src: orionSrc,
      alt: "Modern rendered reconstruction of a Project Orion nuclear-pulse spacecraft firing above Mars",
      kind: "concept illustration",
      credit: "Real Engineering / YouTube",
      sourceUrl: "https://www.youtube.com/watch?v=EVwlTsa9oMM",
      license: "© Real Engineering · source-linked educational use",
    },
    facts: [
      "Project Orion proposed detonating nuclear pulse units behind a pusher plate.",
      "Work began in the United States in the late 1950s.",
      "Many vehicle masses, pulse units, and mission profiles were studied.",
      "No single Orion design provides one defensible interstellar travel time.",
    ],
    missionSummary: "Project Orion began in 1958 as a United States effort led by General Atomics to move payloads far beyond the limits of chemical rockets. It would detonate nuclear pulse units behind a massive pusher plate and use a two-stage shock-absorber system to turn each blast into acceleration—an architecture studied for crewed interplanetary missions and immense interstellar vehicles.",
    canonicalNote: "Orion names a design family. A specific point design must be selected before speed or arrival claims become meaningful.",
  },
  "wandering-earth": {
    vehicleId: "wandering-earth",
    media: {
      src: wanderingEarthSrc,
      alt: "Tor Books cover of Liu Cixin's The Wandering Earth story collection",
      kind: "publisher cover",
      credit: "Tor Books / Macmillan",
      sourceUrl: "https://us.macmillan.com/books/9781250796844/thewanderingearth/",
    },
    facts: [
      "The vehicle is Earth itself, moved by 12,000 giant fusion Earth Engines in the official publisher synopsis.",
      "The novel's 42-year Braking Era halts Earth's rotation before interstellar departure.",
      "The Escape Era uses fifteen increasingly extended solar passes and a planned Jupiter gravity assist.",
      "The 2,500-year plan carries one hundred generations toward Proxima Centauri and the New Sun Era.",
    ],
    missionSummary: "Liu Cixin's The Wandering Earth imagines humanity responding to a dying Sun by turning Earth itself into an interstellar vessel. Twelve thousand fusion-powered Earth Engines halt the planet's rotation, enlarge its solar orbit over fifteen passes, use Jupiter for a planned gravity assist and begin a 2,500-year migration toward Proxima Centauri.",
    canonicalNote: "The cover identifies Liu Cixin's story world; it is not a spacecraft image. The event order is canonical, while orbit shapes and unsupplied stage timings are labelled schematic or inferred rather than presented as an ephemeris.",
  },
  "natural-selection": {
    vehicleId: "natural-selection",
    media: {
      src: darkForestSrc,
      alt: "Tor Books cover of The Dark Forest, source novel for Natural Selection",
      kind: "publisher cover",
      credit: "Tor Books / Macmillan",
      sourceUrl: "https://us.macmillan.com/books/9780765386694/thedarkforest/",
    },
    facts: [
      "Natural Selection appears in Liu Cixin's novel The Dark Forest.",
      "Its departure is bound to Zhang Beihai's decision to escape the Solar System.",
      "Acceleration functions as a political and moral choice in the story.",
      "The novel does not supply a single authoritative exterior image.",
    ],
    missionSummary: "Natural Selection is an Asian Fleet stellar warship in Liu Cixin's The Dark Forest, built for the Solar System's future defence rather than ordinary exploration. Zhang Beihai commandeers it, orders maximum acceleration and commits its crew to an irreversible escape that forces the pursuing ships to confront survival far from Earth.",
    canonicalNote: "No canonical exterior is available. The official English-edition cover is shown as a source marker, not a depiction of the ship.",
  },
  discovery: {
    vehicleId: "discovery",
    media: {
      src: discoverySrc,
      alt: "Officially licensed Kaiyodo replica of Discovery One from 2001: A Space Odyssey",
      kind: "licensed replica",
      credit: "Kaiyodo; 2001 © and ™ Turner Entertainment Co.",
      sourceUrl: "https://kaiyodo.co.jp/discovery/",
    },
    facts: [
      "Discovery One carries the Jupiter mission in Stanley Kubrick's 1968 film.",
      "Arthur C. Clarke's novel sends the ship toward Saturn after Jupiter.",
      "The long spine separates the crew sphere from the propulsion section.",
      "Neither continuity gives a canonical interstellar cruise speed.",
    ],
    missionSummary: "Discovery One is the long-range spacecraft carrying five crew members and the HAL 9000 computer toward Jupiter in Stanley Kubrick's 1968 film 2001: A Space Odyssey. Its centrifuge, hibernation systems, nuclear propulsion section and isolated onboard intelligence embody the film's vision of routine but psychologically fragile deep-space travel.",
    canonicalNote: "The photograph shows an officially licensed reconstruction of the film miniature, not surviving flown hardware or an original production prop.",
  },
  enterprise: {
    vehicleId: "enterprise",
    media: {
      src: enterpriseSrc,
      alt: "TOMY replica of the original-series USS Enterprise NCC-1701 on a display stand",
      kind: "licensed replica",
      credit: "StarTrek.com / TOMY; Star Trek © Paramount/CBS",
      sourceUrl: "https://www.startrek.com/news/toy-company-tomy-readies-for-mission-with-limited-edition-uss-enterprise-replica",
    },
    facts: [
      "NCC-1701 is the original television Enterprise and the 'Silver Lady' here.",
      "Warp drive changes fictional spacetime geometry rather than providing a normal cruise velocity.",
      "Warp-factor formulae vary between Star Trek eras.",
      "A straight kilometre-per-hour conversion would be misleading.",
    ],
    missionSummary: "USS Enterprise NCC-1701 is the Constitution-class Federation starship at the centre of the original Star Trek television series. Built for exploration, diplomacy and defence, it combines a large saucer section, twin warp nacelles, sublight impulse engines and a crew able to operate for years beyond Earth.",
    canonicalNote: "The image is an officially licensed TOMY replica promoted by StarTrek.com; it represents the original-series ship.",
  },
  "millennium-falcon": {
    vehicleId: "millennium-falcon",
    media: {
      src: falconSrc,
      alt: "Millennium Falcon flying through space in an official Star Wars Databank image",
      kind: "official franchise artwork",
      credit: "Lucasfilm Ltd.",
      sourceUrl: "https://www.starwars.com/databank/millennium-falcon",
    },
    facts: [
      "The Millennium Falcon is a modified YT-1300 light freighter.",
      "Its Class 0.5 hyperdrive rating is not a normal-space speed.",
      "Hyperspace journeys depend on routes and narrative continuity.",
      "Screen travel times do not define one reusable velocity.",
    ],
    missionSummary: "The Millennium Falcon is a heavily modified YT-1300 light freighter flown by Han Solo and Chewbacca in Star Wars. Its oversized engines, famously temperamental Class 0.5 hyperdrive and unconventional modifications turn a worn cargo ship into one of the galaxy's fastest and most evasive vessels.",
    canonicalNote: "The image and basic identity come from the official Star Wars Databank; no finite interstellar speed is inferred from them.",
  },
  droplet: {
    vehicleId: "droplet",
    media: {
      src: darkForestSrc,
      alt: "Tor Books cover of The Dark Forest, source novel for the Droplet",
      kind: "publisher cover",
      credit: "Tor Books / Macmillan",
      sourceUrl: "https://us.macmillan.com/books/9780765386694/thedarkforest/",
    },
    facts: [
      "The Droplet is a Trisolaran probe in The Dark Forest.",
      "Its extraordinary manoeuvres matter more than a stable cruise figure.",
      "The novel does not define a complete Earth-to-Proxima transfer profile.",
      "There is no official canonical exterior image in the publisher material.",
    ],
    missionSummary: "The Droplet is a compact Trisolaran probe sent ahead of the main invasion fleet in Liu Cixin's The Dark Forest. Its perfectly reflective strong-interaction shell, extraordinary acceleration and abrupt direction changes allow it to transform from an apparent diplomatic object into a weapon against the human fleet.",
    canonicalNote: "No canonical exterior is available. The official English-edition cover identifies the source novel and is not an image of the probe.",
  },
  warhammer: {
    vehicleId: "warhammer",
    media: {
      src: warhammerSrc,
      alt: "A Word Bearers battlefleet above Calth in official Horus Heresy artwork",
      kind: "official franchise artwork",
      credit: "Rhys Pugh / Games Workshop",
      sourceUrl: "https://www.warhammer-community.com/en-gb/articles/fmeastqX/horus-heresy-history-the-age-of-darkness-has-been-inspiring-artists-for-decades/",
    },
    facts: [
      "The image represents an Imperial-era battlefleet rather than one named vessel.",
      "Warhammer voidships enter the Warp for faster-than-light voyages.",
      "Warp duration and real-space arrival time are deliberately uncertain.",
      "Normal-space route length cannot predict the story's travel time.",
    ],
    missionSummary: "Imperial voidships are immense gothic spacecraft that carry the Imperium of Man between worlds in Warhammer 40,000. Conventional drives move them through realspace, while Warp engines, a Navigator and a protective Gellar field enable dangerous faster-than-light passages through the Immaterium.",
    canonicalNote: "This is official franchise battlefleet art used representatively; it is not a technical portrait of a specific Imperial voidship.",
  },
};

export function getVehicleDossier(vehicleId: string): VehicleDossier {
  const dossier = VEHICLE_DOSSIERS[vehicleId];
  if (!dossier) throw new Error(`Missing vehicle dossier: ${vehicleId}`);
  return dossier;
}
