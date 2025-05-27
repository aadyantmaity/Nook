import { colors } from "./constants/colors"; // Import colors

export const studySpots = [
  {
    id: "1",
    name: "Odegaard Library",
    tags: ["wifi", "outlets", "group-friendly"],
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
        color: colors.purple,
      },
      {
        user: "Bob",
        rating: 4,
        text: "Great for focus, but gets crowded.",
        color: colors.purple,
      },
    ],
    image:
      "https://th.bing.com/th/id/OIP.LMuN07EFFNbJnqgKJTTlUwHaFb?w=235&h=180&c=7&r=0&o=5&dpr=1.6&pid=1.7",
  },
  {
    id: "2",
    name: "Suzallo Library",
    tags: ["wifi", "quiet", "outlets"],
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
    image:
      "https://th.bing.com/th/id/OIP.bN8M6ZxWHS1yrgjebBwL_QHaE8?w=237&h=180&c=7&r=0&o=5&dpr=1.6&pid=1.7",
  },
  // ...more spots...
];
