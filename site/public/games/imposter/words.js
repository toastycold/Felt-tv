// Secret words, by category. The Imposter only ever sees the category.
export const CATEGORIES = {
  'Food': ['Pizza', 'Tacos', 'Pancakes', 'Spaghetti', 'Sushi', 'Burrito', 'Popcorn', 'Lasagna', 'Cheeseburger', 'Waffles', 'Mac and cheese', 'Grilled cheese', 'Cereal', 'Hot dog', 'Meatloaf'],
  'Dessert': ['Ice cream', 'Brownies', 'Cheesecake', 'Apple pie', 'Cupcake', 'Donut', 'Cotton candy', 'Pumpkin pie', 'Cookies', 'Fudge', 'Banana split', 'Churros'],
  'Animal': ['Giraffe', 'Penguin', 'Kangaroo', 'Octopus', 'Elephant', 'Squirrel', 'Owl', 'Shark', 'Moose', 'Flamingo', 'Raccoon', 'Turtle', 'Llama', 'Bat', 'Skunk'],
  'Place': ['Beach', 'Library', 'Airport', 'Hospital', 'Zoo', 'Movie theater', 'Bowling alley', 'Grocery store', 'Church', 'Gym', 'Campground', 'Dentist office', 'Water park', 'Farm'],
  'Job': ['Firefighter', 'Teacher', 'Dentist', 'Pilot', 'Chef', 'Plumber', 'Farmer', 'Lifeguard', 'Mail carrier', 'Barber', 'Astronaut', 'Librarian', 'Mechanic'],
  'Sport': ['Basketball', 'Soccer', 'Bowling', 'Golf', 'Swimming', 'Skiing', 'Tennis', 'Baseball', 'Football', 'Pickleball', 'Hockey', 'Volleyball', 'Wrestling'],
  'Around the house': ['Toaster', 'Couch', 'Vacuum', 'Bathtub', 'Fridge', 'Microwave', 'Lamp', 'Washing machine', 'Doorbell', 'Blender', 'Mailbox', 'Ceiling fan', 'Remote'],
  'Holiday': ['Christmas', 'Halloween', 'Thanksgiving', 'Easter', 'Fourth of July', 'Valentine’s Day', 'New Year’s Eve', 'Birthday', 'Saint Patrick’s Day'],
  'Things outside': ['Snowman', 'Trampoline', 'Sprinkler', 'Campfire', 'Treehouse', 'Rainbow', 'Puddle', 'Hammock', 'Swing set', 'Lawn mower', 'Mailbox', 'Garden'],
  'Getting around': ['Bicycle', 'Train', 'Helicopter', 'Skateboard', 'Canoe', 'Hot air balloon', 'Scooter', 'Submarine', 'Tractor', 'Motorcycle', 'School bus', 'Rollercoaster'],
  'Movie or TV': ['Frozen', 'Star Wars', 'Toy Story', 'The Office', 'Harry Potter', 'Finding Nemo', 'Jurassic Park', 'The Lion King', 'Shrek', 'Home Alone', 'Cars', 'Monsters, Inc.'],
  'Clothing': ['Pajamas', 'Sweater', 'Flip-flops', 'Tuxedo', 'Cowboy boots', 'Raincoat', 'Mittens', 'Swimsuit', 'Baseball cap', 'Scarf', 'Overalls', 'Bow tie'],
};

export const WORDS = Object.entries(CATEGORIES).flatMap(([category, words]) => words.map((word) => ({ word, category })));
