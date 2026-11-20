// Survey boards. Format: 'Answer:points:other ways to say it, separated by commas'.
// Points are our own made-up survey numbers.
const RAW = [
  // ---------- Thanksgiving ----------
  ['Name something people eat at Thanksgiving dinner.',
    ['Turkey:38:bird', 'Mashed potatoes:20:potatoes,potato,spuds', 'Stuffing:14:dressing', 'Pumpkin pie:11:pie,pies', 'Cranberry sauce:8:cranberry,cranberries', 'Rolls:5:bread,dinner rolls,biscuits']],
  ['Name something people do after Thanksgiving dinner.',
    ['Nap:34:sleep,take a nap,fall asleep,snooze', 'Watch football:27:football,watch the game,watch tv,tv', 'Eat dessert:13:dessert,pie,eat pie', 'Wash dishes:11:dishes,clean up,clean', 'Play games:8:games,board games,cards', 'Go shopping:5:shop,black friday,shopping']],
  ['Name something you might be thankful for.',
    ['Family:41:my family,parents,kids', 'Friends:16:friend', 'Health:13:being healthy,good health', 'Food:11:a meal,dinner', 'Home:9:house,a home,roof over my head', 'Job:6:work,my job,employment']],
  ['Name a Thanksgiving side dish.',
    ['Mashed potatoes:31:potatoes,potato', 'Stuffing:22:dressing', 'Green bean casserole:17:green beans,beans,casserole', 'Sweet potatoes:13:yams,sweet potato,candied yams', 'Corn:9:creamed corn', 'Mac and cheese:5:macaroni,mac n cheese']],
  ['Name a kind of pie.',
    ['Pumpkin:36:pumpkin pie', 'Apple:30:apple pie', 'Pecan:15:pecan pie', 'Cherry:9:cherry pie', 'Banana cream:5:banana,cream pie', 'Key lime:4:lime']],
  ['Name something that goes wrong when cooking a big holiday meal.',
    ['Burn something:33:burnt,burned,burn the food,fire', 'Turkey is dry:22:dry turkey,dry,overcooked', 'Undercooked:16:raw,not done,raw turkey', 'Forgot an ingredient:12:forgot something,missing ingredient', 'Smoke alarm goes off:9:smoke alarm,fire alarm,smoke', 'Dropped food:6:dropped,spilled,dropped the turkey']],
  ['Name something on a typical Thanksgiving table besides food.',
    ['Plates:26:dishes,china', 'Silverware:21:forks,knives,utensils,cutlery,spoons', 'Napkins:16:napkin', 'Centerpiece:14:flowers,decorations,candles,candle', 'Tablecloth:12:table cloth', 'Glasses:8:cups,drinks,water glasses']],
  ['Name a reason someone might be late to a family dinner.',
    ['Traffic:39:the roads,road construction', 'Overslept:17:slept in,nap,sleeping', 'Getting ready:15:hair,makeup,dressing', 'Kids:12:children,the kids,the baby', 'Car trouble:9:flat tire,car broke down,car', 'Got lost:6:lost,directions']],
  ['Name something a guest might bring to a holiday dinner.',
    ['Dessert:33:pie,cake,cookies', 'A side dish:24:side,salad,casserole', 'Drinks:16:soda,juice,cider,drink', 'Rolls:11:bread', 'Flowers:9:flower,bouquet', 'A gift:6:present,gifts']],
  ['Name a word that describes how you feel after a big meal.',
    ['Full:38:stuffed,so full', 'Sleepy:26:tired,drowsy', 'Happy:12:content,satisfied', 'Bloated:10:fat,heavy', 'Sick:8:nauseous,gross,uncomfortable', 'Thirsty:4:']],

  // ---------- Around the house ----------
  ['Name something people lose all the time.',
    ['Keys:42:car keys,key', 'Phone:23:cell phone,cellphone', 'Remote:13:tv remote,remote control', 'Glasses:9:sunglasses', 'Wallet:7:purse', 'Socks:4:sock']],
  ['Name a chore kids hate doing.',
    ['Dishes:31:washing dishes,the dishes,dishwasher', 'Clean their room:28:clean room,room,cleaning', 'Laundry:15:fold laundry,folding clothes,clothes', 'Take out the trash:13:trash,garbage', 'Vacuum:8:vacuuming', 'Mow the lawn:5:mow,lawn,yard work']],
  ['Name something in a kitchen junk drawer.',
    ['Batteries:24:battery', 'Rubber bands:19:rubber band', 'Pens:18:pen,pencils,pencil', 'Tape:13:scotch tape', 'Scissors:12:', 'Takeout menus:8:menus,menu', 'Keys:6:key']],
  ['Name something you find under a couch cushion.',
    ['Coins:35:money,change,quarters,pennies', 'Crumbs:24:food,chips', 'Remote:16:tv remote', 'Toys:11:legos,lego,toy', 'Phone:8:cell phone', 'Hair ties:6:hair tie,ponytail']],
  ['Name a reason the family dog might be barking.',
    ['Mail carrier:31:mailman,postman,mail', 'Someone at the door:24:doorbell,door,visitor', 'Another dog:15:dog,dogs', 'Squirrel:12:cat,animal,squirrels', 'Hungry:10:food,wants food', 'Wants to go out:8:outside,potty,walk']],
  ['Name something you do right after you wake up.',
    ['Check phone:27:phone,look at phone', 'Bathroom:24:pee,use the bathroom,potty', 'Brush teeth:18:teeth', 'Shower:13:take a shower', 'Coffee:10:hot chocolate,drink', 'Stretch:8:yawn']],

  // ---------- Food and fun ----------
  ['Name a pizza topping.',
    ['Pepperoni:44:', 'Sausage:16:', 'Mushrooms:13:mushroom', 'Cheese:10:extra cheese', 'Pineapple:9:', 'Olives:8:olive']],
  ['Name something you put on a hot dog.',
    ['Ketchup:36:', 'Mustard:30:', 'Relish:13:', 'Onions:10:onion', 'Chili:6:', 'Cheese:5:']],
  ['Name a popular ice cream flavor.',
    ['Chocolate:33:', 'Vanilla:30:', 'Strawberry:12:', 'Cookie dough:10:cookie', 'Mint chocolate chip:9:mint', 'Cookies and cream:6:oreo']],
  ['Name a board game every family seems to own.',
    ['Monopoly:41:', 'Scrabble:15:', 'Clue:13:', 'Sorry:11:', 'Candy Land:11:candyland', 'Uno:9:cards']],
  ['Name a famous cartoon dog.',
    ['Scooby-Doo:38:scooby,scooby doo', 'Snoopy:27:', 'Pluto:15:', 'Goofy:9:', 'Clifford:7:', 'Bluey:4:']],
  ['Name an animal you might see at a farm.',
    ['Cow:34:cows', 'Pig:22:pigs', 'Horse:15:horses', 'Chicken:13:chickens,hen,rooster', 'Sheep:10:lamb', 'Goat:6:goats']],
  ['Name something people take on a road trip.',
    ['Snacks:38:food,chips,candy', 'Music:18:playlist,radio,songs', 'Pillow:14:blanket,pillows', 'Phone charger:12:charger', 'Map:10:gps,directions', 'Drinks:8:water,soda']],
  ['Name a reason you might call in sick to work.',
    ['Flu:33:fever,sick,the flu,cold', 'Headache:18:migraine', 'Sick kid:16:kids,child is sick', 'Stomach bug:14:throwing up,stomach ache,food poisoning', 'Tired:11:need a break,mental health day', 'Doctor appointment:8:doctor,appointment,dentist']],
  ['Name something people do on a snow day.',
    ['Sledding:30:sled,go sledding', 'Build a snowman:24:snowman', 'Snowball fight:16:snowballs,snowball', 'Drink hot chocolate:12:hot chocolate,cocoa', 'Sleep in:10:sleep,nap', 'Shovel:8:shoveling,shovel snow']],
  ['Name a job where you wear a uniform.',
    ['Police officer:31:cop,police', 'Nurse:20:doctor', 'Firefighter:16:fireman', 'Soldier:13:military,army', 'Mail carrier:11:mailman', 'Fast food worker:9:mcdonalds,waiter,server']],
  ['Name a sport played with a ball.',
    ['Basketball:28:', 'Football:26:', 'Soccer:20:', 'Baseball:16:softball', 'Tennis:6:', 'Volleyball:4:']],
  ['Name something grandparents always say.',
    ['When I was your age:34:back in my day,in my day', 'You have grown so much:21:you got so big,look how big,grown', 'Eat more:16:have more food,are you hungry,you need to eat', 'I love you:12:love you', 'Put a jacket on:10:wear a coat,jacket,coat', 'Turn that down:7:too loud']],
  ['Name something people do at a family reunion.',
    ['Eat:35:food,barbecue,bbq,potluck', 'Take pictures:22:photos,pictures,family photo', 'Catch up:17:talk,visit,chat', 'Play games:13:games,sports', 'Hug:8:hugs', 'Make a family tree:5:history,stories']],
  ['Name something you would find at a birthday party.',
    ['Cake:39:birthday cake', 'Presents:22:gifts,gift', 'Balloons:16:balloon', 'Candles:10:candle', 'Ice cream:7:', 'Party hats:6:hats']],
];

export const SURVEYS = RAW.map(([q, answers]) => ({
  q,
  answers: answers.map((line) => {
    const [text, pts, alt = ''] = line.split(':');
    return { text, points: Number(pts), alts: alt.split(',').map((x) => x.trim()).filter(Boolean) };
  }),
}));
