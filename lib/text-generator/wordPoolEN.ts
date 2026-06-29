export interface WordPool {
  subjek: string[];
  predikat: string[];
  objek: string[];
  keteranganTempat: string[];
  keteranganWaktu: string[];
  kataSifat: string[];
}

/**
 * Daily English vocabulary grouped by grammatical category.
 * Free of IT/technical jargon, easy to edit and expand.
 */
export const wordPoolEN: WordPool = {
  subjek: [
    'the boy', 'the girl', 'the teacher', 'the student', 'the doctor', 'the nurse', 'the officer', 'the firefighter',
    'the driver', 'the pilot', 'the captain', 'the chef', 'the waiter', 'the cashier', 'the farmer', 'the fisherman',
    'the tailor', 'the merchant', 'the buyer', 'the customer', 'the patient', 'the visitor', 'the viewer', 'the singer',
    'the dancer', 'the painter', 'the writer', 'the journalist', 'the photographer', 'the athlete', 'the coach', 'the referee',
    'the judge', 'the lawyer', 'the director', 'the manager', 'the employee', 'the secretary', 'the guard', 'the builder',
    'the mechanic', 'the courier', 'the neighbor', 'the cousin', 'the uncle', 'the aunt', 'the grandfather', 'the grandmother',
    'the father', 'the mother', 'the brother', 'the sister', 'the son', 'the daughter', 'the husband', 'the wife',
    'the friend', 'the partner', 'the guest', 'the host', 'the king', 'the queen', 'the prince', 'the princess',
    'the hero', 'the soldier', 'the commander', 'the president', 'the minister', 'the citizen', 'the baby', 'the child',
    'the toddler', 'the teenager', 'the youth', 'the elder', 'the man', 'the woman', 'the cat', 'the dog',
    'the rabbit', 'the bird', 'the chicken', 'the duck', 'the goose', 'the horse', 'the cow', 'the sheep',
    'the goat', 'the pig', 'the lion', 'the tiger', 'the elephant', 'the giraffe', 'the monkey', 'the squirrel',
    'the mouse', 'the hedgehog', 'the fox', 'the wolf', 'the bear', 'the panda', 'the koala', 'the kangaroo',
    'the dolphin', 'the whale', 'the shark', 'the fish', 'the turtle', 'the frog', 'the snake', 'the lizard',
    'the crocodile', 'the butterfly', 'the bee', 'the ant', 'the grasshopper', 'the dragonfly', 'the spider', 'the caterpillar',
    'the deer', 'the owl', 'the eagle', 'the parrot', 'the swan', 'the penguin', 'the seal', 'the otter',
    'the crab', 'the lobster', 'the octopus', 'the snail', 'the worm', 'the puppy', 'the kitten', 'the hamster',
    'the pigeon', 'the peacock', 'the cheetah', 'the leopard', 'the zebra', 'the hippo', 'the rhino', 'the camel',
    'the donkey', 'the chimpanzee', 'the gorilla', 'the beaver'
  ],
  
  predikat: [
    'eats', 'drinks', 'reads', 'writes', 'sees', 'hears', 'smells', 'touches',
    'holds', 'brings', 'takes', 'puts', 'throws', 'keeps', 'searches', 'finds',
    'chases', 'catches', 'releases', 'buys', 'sells', 'pays', 'exchanges', 'borrows',
    'returns', 'guards', 'cares', 'cleans', 'washes', 'sweeps', 'mops', 'waters',
    'cuts', 'splits', 'peels', 'slices', 'cooks', 'fries', 'boils', 'burns',
    'bakes', 'makes', 'builds', 'repairs', 'breaks', 'draws', 'paints', 'colors',
    'records', 'plays', 'sets', 'starts', 'stops', 'opens', 'closes', 'locks',
    'knocks', 'calls', 'invites', 'greets', 'hugs', 'kisses', 'shakes', 'hits',
    'kicks', 'pushes', 'pulls', 'lifts', 'lowers', 'climbs', 'descends', 'crosses',
    'passes', 'drives', 'rides', 'boards', 'parks', 'guides', 'carries', 'praises',
    'scolds', 'advises', 'teaches', 'learns', 'memorizes', 'counts', 'measures', 'weighs',
    'notes', 'summarizes', 'translates', 'types', 'nails', 'saws', 'carves', 'arranges',
    'organizes', 'tidies', 'decorates', 'wraps', 'tears', 'glues', 'sews', 'knits',
    'embroiders', 'weaves', 'dries', 'irons', 'folds', 'wears', 'removes', 'tries',
    'helps', 'asks', 'answers', 'talks', 'speaks', 'sings', 'whispers', 'shouts',
    'laughs', 'cries', 'smiles', 'frowns', 'walks', 'runs', 'jumps', 'hops',
    'skips', 'dances', 'swims', 'flies', 'crawls', 'rests', 'sleeps', 'wakes',
    'stands', 'sits', 'bends', 'turns', 'watches', 'looks', 'points', 'shows',
    'shares', 'gives', 'receives', 'likes', 'loves', 'hates', 'wants', 'needs'
  ],
  
  objek: [
    'a book', 'a pen', 'a pencil', 'a bag', 'a shoe', 'a shirt', 'a pant', 'a hat',
    'a plate', 'a glass', 'a spoon', 'a fork', 'a bread', 'milk', 'coffee', 'tea',
    'rice', 'a vegetable', 'a fruit', 'meat', 'a bicycle', 'a car', 'a motorcycle', 'a table',
    'a chair', 'paper', 'an umbrella', 'a key', 'a cake', 'a fish', 'water', 'juice',
    'soup', 'noodles', 'cheese', 'butter', 'chocolate', 'candy', 'ice cream', 'a potato',
    'a carrot', 'spinach', 'cabbage', 'a tomato', 'a chili', 'ginger', 'garlic', 'an onion',
    'an orange', 'an apple', 'a banana', 'a mango', 'a grape', 'a strawberry', 'a watermelon', 'a melon',
    'a pineapple', 'a papaya', 'a coconut', 'a guava', 'a peach', 'a cherry', 'a date', 'a raisin',
    'honey', 'jam', 'sauce', 'salt', 'sugar', 'oil', 'flour', 'an egg', 'tofu', 'satay',
    'salad', 'pizza', 'a burger', 'pasta', 'spaghetti', 'a sandwich', 'biscuit', 'chips',
    'a donut', 'pudding', 'jelly', 'syrup', 'soda', 'lemonade', 'yogurt', 'oatmeal',
    'cereal', 'porridge', 'a coin', 'a map', 'a box', 'a basket', 'a card', 'a picture',
    'a flower', 'a leaf', 'a stone', 'sand', 'wood', 'metal', 'glass', 'plastic',
    'cotton', 'wool', 'silk', 'a blanket', 'a pillow', 'a towel', 'a soap', 'a brush',
    'toothpaste', 'a mirror', 'a comb', 'a watch', 'a clock', 'a lamp', 'a candle', 'a match',
    'a thread', 'a needle', 'a scissor', 'a hammer', 'a nail', 'a saw', 'a bucket', 'a broom',
    'a mop', 'a sponge', 'a cloth', 'a tray', 'a bowl', 'a pot', 'a pan',
    'a stove', 'an oven', 'a fridge', 'a sink', 'a door', 'a window', 'a wall', 'a fence',
    'a gate', 'a lock', 'a ring', 'a necklace', 'a toy'
  ],
  
  keteranganTempat: [
    'at home', 'at school', 'at the market', 'on the road', 'on the bridge', 'on the mountain', 'in the river', 'in the sea',
    'at the beach', 'in the forest', 'in the park', 'in the room', 'on the terrace', 'in the garden', 'in the kitchen', 'in the library',
    'at the shop', 'on the field', 'at the cinema', 'in the museum', 'at the zoo', 'at the station', 'at the airport', 'at the harbor',
    'at the terminal', 'at the hotel', 'at the restaurant', 'at the cafe', 'at the office', 'at the bank', 'at the post office', 'at the pharmacy',
    'at the hospital', 'at the clinic', 'at the mosque', 'at the church', 'at the temple', 'at the store', 'at the boutique', 'at the salon',
    'at the workshop', 'at the factory', 'in the rice field', 'in the pond', 'in the pool', 'in the lake', 'on the hill', 'in the valley',
    'in the cave', 'at the waterfall', 'on the island', 'in the city', 'in the village', 'in the neighborhood', 'in the apartment', 'in the dorm',
    'at the orphanage', 'at the nursing home', 'at the police station', 'at the bus stop', 'on the sidewalk', 'at the intersection', 'in the alley', 'in the yard',
    'on the balcony', 'in the attic', 'in the basement', 'in the warehouse', 'in the garage', 'in the living room', 'in the dining room', 'in the study room',
    'in the classroom', 'in the hall', 'in the lobby', 'in the corridor', 'on the stairs', 'in the elevator', 'on the roof', 'in the backyard',
    'in the front yard', 'at the botanical garden', 'in the tea garden', 'in the coffee garden', 'in the fruit garden', 'at the playground', 'at the flower garden', 'at the safari park',
    'in the nature reserve', 'at the mountain peak', 'on the hillside', 'at the foot of the mountain', 'in the river valley', 'by the river', 'in the bay', 'in the strait',
    'in the ocean', 'at the coral reef', 'at the lighthouse', 'at the pier', 'on the runway', 'in the hangar', 'in the train carriage', 'on the bus',
    'in the taxi', 'on the ship', 'on the plane', 'under the tree', 'under the bridge', 'under the table', 'on the chair', 'behind the door',
    'in front of the gate', 'outside the fence', 'inside the building', 'at the stadium', 'at the concert', 'at the gym', 'at the farm', 'in the barn',
    'in the stable', 'at the bakery', 'at the butcher', 'at the bookstore', 'at the toy store', 'at the supermarket', 'at the mall', 'at the circus',
    'in the courtyard', 'on the lawn', 'on the patio', 'in the greenhouse', 'in the orchard', 'in the vineyard', 'in the desert', 'in the oasis',
    'in the swamp', 'in the jungle', 'on the glacier', 'in the canyon', 'on the plateau', 'at the shipyard', 'at the dock'
  ],
  
  keteranganWaktu: [
    'this morning', 'this afternoon', 'this evening', 'tonight', 'yesterday morning', 'tomorrow evening', 'every day', 'at dusk',
    'earlier today', 'last night', 'last week', 'today', 'at dawn', 'yesterday afternoon', 'early this morning', 'later this afternoon',
    'later tonight', 'the day after tomorrow', 'the day before yesterday', 'next week', 'next month', 'next year', 'last month', 'last year',
    'every week', 'every month', 'every year', 'almost every hour', 'a few minutes ago', 'in an hour', 'two days ago', 'in three days',
    'at sunrise', 'at sunset', 'midnight tonight', 'early hours of today', 'at lunchtime', 'before dark', 'when it rains', 'when the storm clears',
    'during dry season', 'when rainy season starts', 'during school holidays', 'on holidays', 'on weekdays', 'every weekend', 'in childhood',
    'in the future', 'in the past', 'during recess', 'when the bell rings', 'after breakfast', 'before sleeping', 'on birthdays', 'in spare time',
    'when the weather is clear', 'when it is cloudy', 'on a cold morning', 'on a warm afternoon', 'on a quiet night', 'at daybreak',
    'when the sun is high', 'when the moon shines', 'when stars appear', 'at the right time', 'at the same time', 'a moment later',
    'shortly after that', 'since then', 'until today', 'until next weekend', 'for a few days', 'all day yesterday', 'all night tonight',
    'at the beginning of the month', 'in the middle of the year', 'at the weekend', 'towards the end of the year', 'at the start of spring',
    'at the end of autumn', 'on Christmas Eve', 'on New Year\'s Eve', 'when the ceremony starts', 'during the meeting', 'when the exhibition opens',
    'during rush hour', 'when roads are quiet', 'in free time', 'during long holidays', 'at harvest time', 'during the eclipse', 'when the wind blows hard',
    'when the tide is high', 'when the tide is low', 'on departure day', 'on arrival', 'just before leaving', 'after dinner', 'before lunch',
    'at coffee break', 'every other day', 'twice a week', 'three times a year', 'once in a while', 'all of a sudden', 'in the blink of an eye',
    'since yesterday', 'for an hour', 'in the morning', 'in the afternoon', 'in the evening', 'at night', 'during the day', 'during the night',
    'in the summer', 'in the winter', 'in the spring', 'in the autumn', 'on Monday morning', 'on Friday evening', 'on Saturday night', 'on Sunday afternoon',
    'during the week', 'over the weekend', 'at the end of the day', 'before sunrise', 'after sunset', 'at noon', 'at midnight', 'when the clock strikes twelve',
    'at the opening hour', 'at closing time', 'during the summer break', 'during winter holidays', 'on public holidays', 'on national days', 'during the festival'
  ],
  
  kataSifat: [
    'big', 'small', 'long', 'short', 'high', 'low', 'wide', 'narrow',
    'thick', 'thin', 'clean', 'dirty', 'new', 'old', 'young', 'good',
    'bad', 'friendly', 'diligent', 'lazy', 'happy', 'sad', 'angry', 'afraid',
    'brave', 'active', 'beautiful', 'fragrant', 'cheap', 'expensive', 'slow', 'fast',
    'strong', 'weak', 'heavy', 'light', 'hard', 'soft', 'rough', 'smooth',
    'sharp', 'dull', 'bright', 'dark', 'hot', 'cold', 'warm', 'cool',
    'wet', 'dry', 'crowded', 'quiet', 'noisy', 'silent', 'neat', 'messy',
    'spacious', 'deep', 'shallow', 'full', 'empty', 'easy', 'difficult', 'smart',
    'stupid', 'clever', 'disciplined', 'honest', 'greedy', 'stingy', 'generous', 'proud',
    'polite', 'naughty', 'obedient', 'calm', 'restless', 'nervous', 'panic', 'anxious',
    'worried', 'safe', 'dangerous', 'healthy', 'sick', 'fresh', 'withered', 'delicious',
    'sweet', 'bitter', 'salty', 'sour', 'spicy', 'hungry', 'thirsty', 'tired', 'exhausted',
    'fit', 'busy', 'free', 'close', 'far', 'tight', 'loose', 'similar',
    'different', 'same', 'other', 'strange', 'familiar', 'famous', 'popular', 'ordinary',
    'special', 'unique', 'rare', 'common', 'tall', 'skinny', 'fat', 'slim',
    'pretty', 'handsome', 'ugly', 'kind', 'cruel', 'rude', 'gentle', 'harsh',
    'cowardly', 'dishonest', 'wise', 'foolish', 'rich', 'poor', 'wealthy', 'costly',
    'loud', 'dim', 'clear', 'blurry', 'perfect', 'flawless', 'faulty'
  ]
};
