// Historic and upcoming moments: picking one jumps the clock there and flies to the scene.
export interface Moment {
  label: string;
  date: string;
  focus: string;
  /** Zoom (log10 m); defaults to the focus object's own view. */
  logD?: number;
  note: string;
}

export const MOMENTS: Moment[] = [
  { label: 'Apollo 8 sees Earthrise', date: '1968-12-24T16:40:00Z', focus: 'moon',
    note: 'The first humans to orbit the Moon photograph Earth rising over its horizon.' },
  { label: 'Apollo 11 lands on the Moon', date: '1969-07-20T20:17:40Z', focus: 'moon',
    note: 'The Eagle touches down in the Sea of Tranquility; Neil Armstrong steps out six and a half hours later.' },
  { label: 'Mars closest in 60,000 years', date: '2003-08-27T09:51:00Z', focus: 'earth', logD: 11.15,
    note: 'Mars came within 55.8 million km of Earth, its closest approach since the Stone Age.' },
  { label: 'Transit of Venus', date: '2012-06-06T01:29:00Z', focus: 'earth', logD: 11.35,
    note: 'Venus crossed the face of the Sun as seen from Earth. The next transit is in December 2117.' },
  { label: 'Great Conjunction', date: '2020-12-21T18:20:00Z', focus: 'earth', logD: 12.55,
    note: 'Jupiter and Saturn appeared closer together in our sky than at any time since 1623. Try the sky view.' },
  { label: 'Total solar eclipse, North America', date: '2024-04-08T18:17:00Z', focus: 'earth', logD: 8.95,
    note: 'The Moon passed directly between the Sun and Earth, darkening a path from Mexico to Canada.' },
  { label: 'Total solar eclipse, Egypt', date: '2027-08-02T10:07:00Z', focus: 'earth', logD: 8.95,
    note: 'The longest total eclipse on land this century: over six minutes of darkness near Luxor.' },
  { label: 'Planets gather at dusk', date: '2040-09-08T18:00:00Z', focus: 'earth', logD: 12.3,
    note: 'Mercury, Venus, Mars, Jupiter and Saturn crowd into one small patch of the evening sky.' },
];
