export const studySpots = [
  {
    id: "1",
    name: "Central Library",
    location: { lat: 37.7749, lng: -122.4194 },
    tags: ["quiet", "wifi", "outlets"],
    ratings: {
      wifi: 4.5,
      noise: 1.2,
      outlets: 4.8,
      crowd: 2.1,
    },
    reviews: [
      {
        user: "Alice",
        rating: 5,
        text: "Super quiet and fast WiFi.",
        color: "#4B2E83",
      },
      {
        user: "Bob",
        rating: 4,
        text: "Great for focus, but gets crowded.",
        color: "#4B2E83",
      },
    ],
  },
  {
    id: "2",
    name: "Cafe Mocha",
    location: { lat: 37.775, lng: -122.418 },
    tags: ["wifi", "group-friendly"],
    ratings: {
      wifi: 4.2,
      noise: 3.5,
      outlets: 3.0,
      crowd: 3.8,
    },
    reviews: [
      {
        user: "Eve",
        rating: 4,
        text: "Good coffee, decent WiFi.",
        color: "#4B2E83",
      },
    ],
  },
  // ...more spots...
];
