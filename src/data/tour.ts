// The guided tour: a flight from Earth to the edge of the observable universe and back.
export interface TourStop {
  focus: string;
  /** Zoom (log10 m); defaults to the focus object's own view. */
  logD?: number;
  /** Camera direction as galactic [l, b] degrees, for the galaxy-scale stops. */
  viewGal?: [number, number];
  title: string;
  text: string;
  /** Seconds to linger after arriving. */
  hold: number;
}

export const TOUR: TourStop[] = [
  { focus: 'earth', logD: 7.55, title: 'Home', hold: 6,
    text: 'Everyone you have ever known lives on this sphere, 12,742 km across, lit right now by the real Sun.' },
  { focus: 'moon', title: 'The Moon', hold: 6,
    text: 'Our companion is 384,400 km away. Light makes the trip in 1.3 seconds; Apollo took three days.' },
  { focus: 'sun', logD: 11.65, title: 'The inner solar system', hold: 6,
    text: 'Mercury, Venus, Earth and Mars: the rocky planets, all huddled within 1.5 AU of the Sun.' },
  { focus: 'saturn', title: 'Saturn', hold: 6,
    text: 'A gas giant nine times wider than Earth, with rings 280,000 km across but only about 10 m thick.' },
  { focus: 'sun', logD: 13.05, title: 'The outer planets', hold: 6,
    text: 'Neptune orbits 30 times farther out than Earth. Sunlight takes four hours to reach it.' },
  { focus: 'sun', logD: 14.2, title: 'The edge of the Sun\'s influence', hold: 6,
    text: 'The heliopause, where the solar wind gives way to interstellar space. Both Voyagers have crossed it.' },
  { focus: 'sun', logD: 17.4, title: 'Our stellar neighbors', hold: 7,
    text: 'The nearest star, Proxima Centauri, is 4.2 light-years away. Voyager 1 would need 73,000 years to get there.' },
  { focus: 'milky-way', logD: 21.05, viewGal: [180, 50], title: 'The Milky Way', hold: 7,
    text: 'Our galaxy: a few hundred billion stars in a disk 100,000 light-years wide. We orbit its center every 230 million years.' },
  { focus: 'local-group', logD: 22.75, viewGal: [150, 35], title: 'The Local Group', hold: 7,
    text: 'Andromeda, 2.5 million light-years away, is falling toward us. The two galaxies will merge in about 4.5 billion years.' },
  { focus: 'milky-way', logD: 25.2, title: 'The cosmic web', hold: 7,
    text: 'Galaxies gather along vast filaments around empty voids. Every speck here is a galaxy.' },
  { focus: 'observable-universe', title: 'The edge of what we can see', hold: 8,
    text: 'Light from here has traveled 13.8 billion years to reach us. Beyond it, the universe goes on, unseen.' },
  { focus: 'earth', logD: 7.55, title: 'You are here', hold: 6,
    text: 'And back to one pale blue dot. Scroll, search or tap anything to explore on your own.' },
];
