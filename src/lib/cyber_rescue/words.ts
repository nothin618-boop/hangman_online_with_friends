export interface RescueWord {
  word: string;
  category: string;
  hint: string;
}

export const CATEGORIES = [
  'ALL',
  'GAMING',
  'MOVIES & HEROES',
  'CYBER & TECH',
  'WILD ANIMALS',
  'SPACE & MYSTERY',
  'FOOD & DESSERTS',
  'WORLD & CITIES',
  'SPORTS & ATHLETES',
  'MYTHS & MONSTERS',
  'NATURE & ADVENTURE',
] as const;

export type CategoryType = (typeof CATEGORIES)[number];

export const WORD_CATALOG: RescueWord[] = [
  // 1. GAMING
  { word: 'MINECRAFT', category: 'GAMING', hint: 'Block building and diamond mining survival game' },
  { word: 'CYBERPUNK', category: 'GAMING', hint: 'Night City open-world futuristic RPG' },
  { word: 'PACMAN', category: 'GAMING', hint: 'Arcade hero that chomps dots and evades ghosts' },
  { word: 'POKEMON', category: 'GAMING', hint: 'Gotta catch them all creature battle series' },
  { word: 'FORTNITE', category: 'GAMING', hint: 'Battle Royale game with building and battle bus' },
  { word: 'ROBLOX', category: 'GAMING', hint: 'Sandbox universe of user-created virtual games' },
  { word: 'WITCHER', category: 'GAMING', hint: 'Geralt of Rivia monster hunting fantasy RPG' },
  { word: 'ZELDA', category: 'GAMING', hint: 'Link adventures across Hyrule to save the princess' },
  { word: 'SONIC', category: 'GAMING', hint: 'Blue hedgehog that races at super sonic speeds' },
  { word: 'MARIO', category: 'GAMING', hint: 'Mushroom Kingdom plumber on a quest to rescue Peach' },
  { word: 'PORTAL', category: 'GAMING', hint: 'Puzzle game with blue and orange physics portals' },
  { word: 'DOOM', category: 'GAMING', hint: 'Legendary sci-fi demon slayer with heavy metal music' },
  { word: 'APEX', category: 'GAMING', hint: 'High-speed hero shooter set in the Titanfall universe' },
  { word: 'VALORANT', category: 'GAMING', hint: 'Tactical hero shooter by Riot Games' },
  { word: 'SKYRIM', category: 'GAMING', hint: 'Dragonborn RPG with shouting and ancient dragons' },
  { word: 'OVERWATCH', category: 'GAMING', hint: 'Team-based hero shooter with Payload delivery' },
  { word: 'TETRIS', category: 'GAMING', hint: 'Classic Soviet puzzle falling tetromino blocks' },
  { word: 'HALO', category: 'GAMING', hint: 'Master Chief Spartan soldier fighting the Covenant' },
  { word: 'ELDENRING', category: 'GAMING', hint: 'Dark fantasy soulslike epic in the Lands Between' },
  { word: 'ASSASSIN', category: 'GAMING', hint: 'Creed brotherhood fighting Templars across history' },
  { word: 'FALLGUYS', category: 'GAMING', hint: 'Hilarious multiplayer jelly bean obstacle race' },
  { word: 'AMONGUS', category: 'GAMING', hint: 'Spaceship deduction game with sneaky impostors' },
  { word: 'TERRARIA', category: 'GAMING', hint: '2D sandbox adventure with boss fights and crafting' },
  { word: 'SUBNAUTICA', category: 'GAMING', hint: 'Alien ocean survival with seamoths and leviathans' },
  { word: 'BIOSHOCK', category: 'GAMING', hint: 'Underwater dystopian city Rapture with Big Daddies' },
  { word: 'METROID', category: 'GAMING', hint: 'Samus Aran bounty hunter fighting space pirates' },
  { word: 'UNCHARTED', category: 'GAMING', hint: 'Nathan Drake treasure hunting globetrotting journey' },
  { word: 'CUPHEAD', category: 'GAMING', hint: '1930s rubber hose cartoon style boss rush run-and-gun' },
  { word: 'JOYSTICK', category: 'GAMING', hint: 'Handheld gaming controller lever for direction input' },
  { word: 'NINTENDO', category: 'GAMING', hint: 'Japanese gaming titan behind Switch, Mario, and Zelda' },
  { word: 'POKEBALL', category: 'GAMING', hint: 'Red and white sphere used by trainers to catch Pokemon' },
  { word: 'SEGA', category: 'GAMING', hint: 'Legendary arcade company and creator of Sonic the Hedgehog' },

  // 2. MOVIES & HEROES
  { word: 'BATMAN', category: 'MOVIES & HEROES', hint: 'Dark Knight billionaire vigilante of Gotham City' },
  { word: 'MATRIX', category: 'MOVIES & HEROES', hint: 'Neo takes the red pill to escape simulated reality' },
  { word: 'AVENGERS', category: 'MOVIES & HEROES', hint: 'Earths Mightiest Heroes assemble against Thanos' },
  { word: 'NARUTO', category: 'MOVIES & HEROES', hint: 'Nine-Tailed fox ninja who dreams of becoming Hokage' },
  { word: 'SPIDERMAN', category: 'MOVIES & HEROES', hint: 'Friendly neighborhood wall-crawler with web shooters' },
  { word: 'PIKACHU', category: 'MOVIES & HEROES', hint: 'Electric mouse partner of Ash Ketchum' },
  { word: 'IRONMAN', category: 'MOVIES & HEROES', hint: 'Tony Stark in powered armor with arc reactor' },
  { word: 'JOKER', category: 'MOVIES & HEROES', hint: 'Clown Prince of Crime and Batmans arch-nemesis' },
  { word: 'GANDALF', category: 'MOVIES & HEROES', hint: 'Grey wizard who proclaimed: You shall not pass!' },
  { word: 'GODZILLA', category: 'MOVIES & HEROES', hint: 'King of the Monsters with atomic radioactive breath' },
  { word: 'TERMINATOR', category: 'MOVIES & HEROES', hint: 'Cybernetic assassin sent back from the future' },
  { word: 'OPTIMUS', category: 'MOVIES & HEROES', hint: 'Leader of the Autobots who transforms into a truck' },
  { word: 'YODA', category: 'MOVIES & HEROES', hint: 'Grand Jedi Master who spoke in inverted sentences' },
  { word: 'DEADPOOL', category: 'MOVIES & HEROES', hint: 'Merc with a mouth who breaks the fourth wall' },
  { word: 'SUPERMAN', category: 'MOVIES & HEROES', hint: 'Man of Steel from Krypton vulnerable to green rocks' },
  { word: 'WOLVERINE', category: 'MOVIES & HEROES', hint: 'Adamantium clawed mutant with healing factor' },
  { word: 'INCEPTION', category: 'MOVIES & HEROES', hint: 'Dream inside a dream thriller with a spinning totem' },
  { word: 'GLADIATOR', category: 'MOVIES & HEROES', hint: 'Roman general who defied an empire in the Colosseum' },
  { word: 'INTERSTELLAR', category: 'MOVIES & HEROES', hint: 'Sci-fi space voyage through a Saturn wormhole' },
  { word: 'VOLDEMORT', category: 'MOVIES & HEROES', hint: 'Dark Lord He-Who-Must-Not-Be-Named in Harry Potter' },
  { word: 'SHERLOCK', category: 'MOVIES & HEROES', hint: 'Consulting detective of 221B Baker Street' },
  { word: 'THOR', category: 'MOVIES & HEROES', hint: 'Asgardian god of thunder wielding enchanted hammer' },
  { word: 'AQUAMAN', category: 'MOVIES & HEROES', hint: 'King of the Seven Seas wielding the golden trident' },
  { word: 'LUFFY', category: 'MOVIES & HEROES', hint: 'Straw Hat pirate captain aiming to find One Piece' },
  { word: 'GOKU', category: 'MOVIES & HEROES', hint: 'Saiyan warrior who masters Kamehameha and Ultra Instinct' },
  { word: 'HULK', category: 'MOVIES & HEROES', hint: 'Green radioactive powerhouse: Hulk smash!' },
  { word: 'FLASH', category: 'MOVIES & HEROES', hint: 'Scarlet Speedster who taps into the Speed Force' },
  { word: 'VENOM', category: 'MOVIES & HEROES', hint: 'Alien symbiote anti-hero bonded with Eddie Brock' },
  { word: 'GROOT', category: 'MOVIES & HEROES', hint: 'Sentient tree alien who only says: I am Groot' },
  { word: 'THANOS', category: 'MOVIES & HEROES', hint: 'Titan who sought all six Infinity Stones for the snap' },
  { word: 'SHREK', category: 'MOVIES & HEROES', hint: 'Friendly green ogre who lives happily in his swamp' },
  { word: 'ALADDIN', category: 'MOVIES & HEROES', hint: 'Street urchin who finds a magic lamp with a Genie' },

  // 3. CYBER & TECH
  { word: 'HACKER', category: 'CYBER & TECH', hint: 'Elite operative who bypasses computer security' },
  { word: 'ROBOT', category: 'CYBER & TECH', hint: 'Autonomous mechanical unit built for automation' },
  { word: 'LASER', category: 'CYBER & TECH', hint: 'Concentrated beam of coherent amplified light' },
  { word: 'SATELLITE', category: 'CYBER & TECH', hint: 'Orbital communication device in outer space' },
  { word: 'TERMINAL', category: 'CYBER & TECH', hint: 'Command line console for entering system code' },
  { word: 'QUANTUM', category: 'CYBER & TECH', hint: 'Subatomic physics power for next-gen computing' },
  { word: 'GLITCH', category: 'CYBER & TECH', hint: 'Temporary malfunction or visual digital anomaly' },
  { word: 'CIRCUIT', category: 'CYBER & TECH', hint: 'Electronic board pathway carrying electric current' },
  { word: 'MAINFRAME', category: 'CYBER & TECH', hint: 'Central high-performance enterprise server core' },
  { word: 'FIREWALL', category: 'CYBER & TECH', hint: 'Network security barrier blocking unauthorized access' },
  { word: 'HOLOGRAM', category: 'CYBER & TECH', hint: '3D light projection floating in mid-air' },
  { word: 'DRONE', category: 'CYBER & TECH', hint: 'Unmanned aerial quadcopter with camera' },
  { word: 'ALGORITHM', category: 'CYBER & TECH', hint: 'Step-by-step computational mathematical procedure' },
  { word: 'DATABASE', category: 'CYBER & TECH', hint: 'Organized structured collection of digital information' },
  { word: 'NETWORK', category: 'CYBER & TECH', hint: 'Interconnected system of computing devices sharing data' },
  { word: 'SOFTWARE', category: 'CYBER & TECH', hint: 'Programs and operating information used by computers' },
  { word: 'HARDWARE', category: 'CYBER & TECH', hint: 'Physical electronic machinery and components of a PC' },
  { word: 'PROCESSOR', category: 'CYBER & TECH', hint: 'Central processing unit brain executing instructions' },
  { word: 'INTERNET', category: 'CYBER & TECH', hint: 'Global worldwide network connecting billions of computers' },
  { word: 'BLUETOOTH', category: 'CYBER & TECH', hint: 'Short-range wireless frequency for pairing devices' },
  { word: 'ENCRYPTION', category: 'CYBER & TECH', hint: 'Converting plain text into scrambled cryptographic cipher' },
  { word: 'SERVER', category: 'CYBER & TECH', hint: 'Dedicated computer node providing resources to clients' },
  { word: 'BROWSER', category: 'CYBER & TECH', hint: 'Web navigator application used to surf pages online' },
  { word: 'ANTIVIRUS', category: 'CYBER & TECH', hint: 'Security utility that hunts and purges digital malware' },
  { word: 'MICROCHIP', category: 'CYBER & TECH', hint: 'Miniature silicon wafer containing integrated circuits' },
  { word: 'CODING', category: 'CYBER & TECH', hint: 'Writing syntax instructions for software development' },
  { word: 'PYTHON', category: 'CYBER & TECH', hint: 'Popular interpreted programming language with clean syntax' },
  { word: 'ROUTER', category: 'CYBER & TECH', hint: 'Networking box that routes data packets between networks' },
  { word: 'ANDROID', category: 'CYBER & TECH', hint: 'Open-source mobile operating system developed by Google' },

  // 4. WILD ANIMALS
  { word: 'CHEETAH', category: 'WILD ANIMALS', hint: 'Fastest land animal on Earth with spotted coat' },
  { word: 'FALCON', category: 'WILD ANIMALS', hint: 'Predatory bird capable of 200 mph hunting dives' },
  { word: 'DOLPHIN', category: 'WILD ANIMALS', hint: 'Highly intelligent marine mammal that clicks and leaps' },
  { word: 'PANTHER', category: 'WILD ANIMALS', hint: 'Stealthy black apex feline hunter in tropical jungles' },
  { word: 'COBRA', category: 'WILD ANIMALS', hint: 'Venomous hooded serpent that flares when threatened' },
  { word: 'TIGER', category: 'WILD ANIMALS', hint: 'Largest wild cat species with orange and black stripes' },
  { word: 'PHOENIX', category: 'WILD ANIMALS', hint: 'Mythical immortal bird that rises from its own ashes' },
  { word: 'DRAGON', category: 'WILD ANIMALS', hint: 'Legendary winged serpent that breathes roaring fire' },
  { word: 'WOLF', category: 'WILD ANIMALS', hint: 'Canine predator that hunts in coordinated packs' },
  { word: 'EAGLE', category: 'WILD ANIMALS', hint: 'Majestic bird of prey with razor-sharp talons' },
  { word: 'SHARK', category: 'WILD ANIMALS', hint: 'Ocean predator with multiple rows of serrated teeth' },
  { word: 'CHAMELEON', category: 'WILD ANIMALS', hint: 'Reptile that shifts color and moves eyes independently' },
  { word: 'GORILLA', category: 'WILD ANIMALS', hint: 'Massive primate of central African mountain forests' },
  { word: 'KANGAROO', category: 'WILD ANIMALS', hint: 'Australian marsupial that hops and carries joey in pouch' },
  { word: 'PENGUIN', category: 'WILD ANIMALS', hint: 'Flightless tuxedo-feathered bird gliding on Antarctic ice' },
  { word: 'ELEPHANT', category: 'WILD ANIMALS', hint: 'Giant mammal with long prehensile trunk and ivory tusks' },
  { word: 'LEOPARD', category: 'WILD ANIMALS', hint: 'Spotted solitary cat that drags heavy prey into trees' },
  { word: 'PLATYPUS', category: 'WILD ANIMALS', hint: 'Semi-aquatic egg-laying mammal with a duck bill' },
  { word: 'OCTOPUS', category: 'WILD ANIMALS', hint: 'Eight-armed sea creature with three hearts and blue blood' },
  { word: 'RHINOCEROS', category: 'WILD ANIMALS', hint: 'Armored herbivore known for massive horns on snout' },
  { word: 'GIRAFFE', category: 'WILD ANIMALS', hint: 'Tallest living animal on Earth with long patterned neck' },
  { word: 'FLAMINGO', category: 'WILD ANIMALS', hint: 'Pink wading bird that stands gracefully on one slender leg' },
  { word: 'CROCODILE', category: 'WILD ANIMALS', hint: 'Ancient prehistoric aquatic reptile with bone-crushing bite' },
  { word: 'KOALA', category: 'WILD ANIMALS', hint: 'Tree-dwelling Australian bear that munches eucalyptus leaves' },
  { word: 'JAGUAR', category: 'WILD ANIMALS', hint: 'Powerful spotted feline of the Amazon with immense jaw power' },
  { word: 'HEDGEHOG', category: 'WILD ANIMALS', hint: 'Spiny small nocturnal mammal that rolls into a prickly ball' },
  { word: 'WALRUS', category: 'WILD ANIMALS', hint: 'Whiskered Arctic flippered mammal with long downward tusks' },
  { word: 'STINGRAY', category: 'WILD ANIMALS', hint: 'Flat cartilaginous fish with wide fins gliding along sea floor' },
  { word: 'ZEBRA', category: 'WILD ANIMALS', hint: 'African wild equines known for distinct black and white stripes' },
  { word: 'MONKEY', category: 'WILD ANIMALS', hint: 'Agile primate with nimble hands swinging across canopy branches' },

  // 5. SPACE & MYSTERY
  { word: 'PYRAMID', category: 'SPACE & MYSTERY', hint: 'Monumental ancient stone tombs built in Giza' },
  { word: 'EVEREST', category: 'SPACE & MYSTERY', hint: 'Highest mountain peak in the world in Himalayas' },
  { word: 'ATLANTIS', category: 'SPACE & MYSTERY', hint: 'Lost mythical civilization swallowed by the ocean' },
  { word: 'BERMUDA', category: 'SPACE & MYSTERY', hint: 'Infamous triangle where planes and ships disappear' },
  { word: 'VOLCANO', category: 'SPACE & MYSTERY', hint: 'Mountain that erupts with red-hot molten lava' },
  { word: 'GALAXY', category: 'SPACE & MYSTERY', hint: 'Vast spiral system of billions of stars and planets' },
  { word: 'NEBULA', category: 'SPACE & MYSTERY', hint: 'Luminous interstellar cosmic cloud of dust and gas' },
  { word: 'ASTEROID', category: 'SPACE & MYSTERY', hint: 'Rocky celestial body hurtling through outer space' },
  { word: 'SUPERNOVA', category: 'SPACE & MYSTERY', hint: 'Cataclysmic explosive death of a massive dying star' },
  { word: 'ECLIPSE', category: 'SPACE & MYSTERY', hint: 'Celestial alignment when the moon blocks the sun' },
  { word: 'BLACKHOLE', category: 'SPACE & MYSTERY', hint: 'Region of spacetime with gravity so strong light cannot escape' },
  { word: 'METEOR', category: 'SPACE & MYSTERY', hint: 'Streak of light produced when a meteoroid burns in atmosphere' },
  { word: 'COSMOS', category: 'SPACE & MYSTERY', hint: 'The universe seen as an orderly harmonious whole' },
  { word: 'TELESCOPE', category: 'SPACE & MYSTERY', hint: 'Optical instrument designed to view distant stars and planets' },
  { word: 'ASTRONAUT', category: 'SPACE & MYSTERY', hint: 'Space explorer trained to travel beyond Earth atmosphere' },
  { word: 'SPACESHIP', category: 'SPACE & MYSTERY', hint: 'Vehicle designed for crewed interstellar navigation' },
  { word: 'JUPITER', category: 'SPACE & MYSTERY', hint: 'Largest gas giant in our solar system with Great Red Spot' },
  { word: 'SATURN', category: 'SPACE & MYSTERY', hint: 'Sixth planet from Sun famous for spectacular ring system' },
  { word: 'ANDROMEDA', category: 'SPACE & MYSTERY', hint: 'Major spiral galaxy nearest to our Milky Way galaxy' },
  { word: 'WORMHOLE', category: 'SPACE & MYSTERY', hint: 'Theoretical portal shortcut through curved spacetime' },
  { word: 'MULTIVERSE', category: 'SPACE & MYSTERY', hint: 'Hypothetical collection of infinitely many parallel universes' },
  { word: 'AURORA', category: 'SPACE & MYSTERY', hint: 'Glowing northern lights caused by solar winds hitting magnetosphere' },

  // 6. FOOD & DESSERTS
  { word: 'PIZZA', category: 'FOOD & DESSERTS', hint: 'Oven-baked flatbread topped with tomato sauce and melted cheese' },
  { word: 'BURGER', category: 'FOOD & DESSERTS', hint: 'Patty inside a sliced bun with lettuce and condiments' },
  { word: 'CHOCOLATE', category: 'FOOD & DESSERTS', hint: 'Sweet cocoa bean confection loved worldwide' },
  { word: 'PANCAKE', category: 'FOOD & DESSERTS', hint: 'Flat round griddled batter breakfast cake served with syrup' },
  { word: 'WAFFLE', category: 'FOOD & DESSERTS', hint: 'Crisp honeycomb patterned griddle cake eaten with butter' },
  { word: 'SUSHI', category: 'FOOD & DESSERTS', hint: 'Japanese dish with vinegared rice, raw fish and nori seaweed' },
  { word: 'BURRITO', category: 'FOOD & DESSERTS', hint: 'Warm flour tortilla tightly wrapped around savory fillings' },
  { word: 'NOODLES', category: 'FOOD & DESSERTS', hint: 'Long ribbons of unleavened dough cooked in boiling broth' },
  { word: 'POPCORN', category: 'FOOD & DESSERTS', hint: 'Puffed corn kernels exploded by hot air or butter' },
  { word: 'ICECREAM', category: 'FOOD & DESSERTS', hint: 'Chilled sweetened frozen dairy dessert in scoops' },
  { word: 'DOUGHNUT', category: 'FOOD & DESSERTS', hint: 'Fried ring of sweetened dough glazed with sugar or sprinkles' },
  { word: 'CROISSANT', category: 'FOOD & DESSERTS', hint: 'Buttery flaky crescent shaped French pastry' },
  { word: 'SMOOTHIE', category: 'FOOD & DESSERTS', hint: 'Thick creamy blended beverage of fruits and yogurt' },
  { word: 'SANDWICH', category: 'FOOD & DESSERTS', hint: 'Two slices of bread enclosing fillings like cheese or meat' },
  { word: 'LASAGNA', category: 'FOOD & DESSERTS', hint: 'Layered Italian pasta with rich meat sauce and ricotta' },
  { word: 'CHEESECAKE', category: 'FOOD & DESSERTS', hint: 'Decadent baked dessert with soft cream cheese on crumb crust' },
  { word: 'BROWNIE', category: 'FOOD & DESSERTS', hint: 'Dense fudgy square chocolate baked dessert' },
  { word: 'COOKIE', category: 'FOOD & DESSERTS', hint: 'Sweet baked biscuit studded with chocolate chips' },
  { word: 'MUFFIN', category: 'FOOD & DESSERTS', hint: 'Individual cup-shaped quick bread baked with blueberries' },
  { word: 'CUPCAKE', category: 'FOOD & DESSERTS', hint: 'Small single-serving sponge cake topped with swirled frosting' },

  // 7. WORLD & CITIES
  { word: 'TOKYO', category: 'WORLD & CITIES', hint: 'High-tech neon bustling metropolis capital of Japan' },
  { word: 'PARIS', category: 'WORLD & CITIES', hint: 'City of Light in France renowned for the Eiffel Tower' },
  { word: 'LONDON', category: 'WORLD & CITIES', hint: 'Historic British capital on the River Thames with Big Ben' },
  { word: 'DUBAI', category: 'WORLD & CITIES', hint: 'Desert futuristic city home to the towering Burj Khalifa' },
  { word: 'SYDNEY', category: 'WORLD & CITIES', hint: 'Australian harbor city iconic for its sail-shaped Opera House' },
  { word: 'CAIRO', category: 'WORLD & CITIES', hint: 'Capital of Egypt situated along the ancient Nile river' },
  { word: 'MUMBAI', category: 'WORLD & CITIES', hint: 'Financial capital of India famous for Gateway of India and sea' },
  { word: 'BERLIN', category: 'WORLD & CITIES', hint: 'German capital famous for its Brandenburg Gate and vibrant arts' },
  { word: 'VENICE', category: 'WORLD & CITIES', hint: 'Italian city of winding canals and romantic gondolas' },
  { word: 'ROME', category: 'WORLD & CITIES', hint: 'Eternal City filled with ancient ruins and the Vatican' },
  { word: 'NEWYORK', category: 'WORLD & CITIES', hint: 'The Big Apple with Times Square and Statue of Liberty' },
  { word: 'TORONTO', category: 'WORLD & CITIES', hint: 'Major Canadian lakeside city with the soaring CN Tower' },
  { word: 'BANGKOK', category: 'WORLD & CITIES', hint: 'Vibrant Thai capital with ornate shrines and bustling street markets' },
  { word: 'ICELAND', category: 'WORLD & CITIES', hint: 'Nordic island nation of volcanoes, geysers, hot springs and glaciers' },
  { word: 'AMAZON', category: 'WORLD & CITIES', hint: 'Vast South American river basin and largest tropical rainforest' },
  { word: 'SAHARA', category: 'WORLD & CITIES', hint: 'Largest hot subtropical sand desert spanning North Africa' },
  { word: 'DELHI', category: 'WORLD & CITIES', hint: 'Historic capital city of India featuring India Gate and Red Fort' },
  { word: 'SINGAPORE', category: 'WORLD & CITIES', hint: 'Island city-state famed for Marina Bay Sands and Garden by Bay' },

  // 8. SPORTS & ATHLETES
  { word: 'FOOTBALL', category: 'SPORTS & ATHLETES', hint: 'World most played game kicking a ball into the goal net' },
  { word: 'CRICKET', category: 'SPORTS & ATHLETES', hint: 'Bat-and-ball game played between two teams of eleven on a pitch' },
  { word: 'BASKETBALL', category: 'SPORTS & ATHLETES', hint: 'Fast-paced indoor game dribbling and shooting into an elevated hoop' },
  { word: 'TENNIS', category: 'SPORTS & ATHLETES', hint: 'Racket sport hitting a felt ball across a net at Wimbledon' },
  { word: 'BADMINTON', category: 'SPORTS & ATHLETES', hint: 'Speedy racket sport hitting feathered shuttlecock over high net' },
  { word: 'BASEBALL', category: 'SPORTS & ATHLETES', hint: 'Diamond field game with home runs, pitchers, and strikes' },
  { word: 'ARCHERY', category: 'SPORTS & ATHLETES', hint: 'Precision art of shooting arrows at a bullseye target' },
  { word: 'SURFING', category: 'SPORTS & ATHLETES', hint: 'Riding breaking ocean waves standing on a surfboard' },
  { word: 'BOXING', category: 'SPORTS & ATHLETES', hint: 'Combat ring sport with gloved punches and knockouts' },
  { word: 'MARATHON', category: 'SPORTS & ATHLETES', hint: 'Long-distance 26.2 mile endurance foot race' },
  { word: 'VOLLEYBALL', category: 'SPORTS & ATHLETES', hint: 'Hitting a ball back and forth with hands over a net without grounding' },
  { word: 'CYCLING', category: 'SPORTS & ATHLETES', hint: 'Riding bicycles on roads or mountain tracks like Tour de France' },
  { word: 'BOWLING', category: 'SPORTS & ATHLETES', hint: 'Rolling heavy ball down lane to knock down ten pins' },
  { word: 'KARATE', category: 'SPORTS & ATHLETES', hint: 'Traditional Japanese martial art with striking kicks and black belts' },
  { word: 'SWIMMING', category: 'SPORTS & ATHLETES', hint: 'Propelling through water using strokes like freestyle and butterfly' },

  // 9. MYTHS & MONSTERS
  { word: 'GRIFFIN', category: 'MYTHS & MONSTERS', hint: 'Legendary creature with body of a lion and head and wings of an eagle' },
  { word: 'PEGASUS', category: 'MYTHS & MONSTERS', hint: 'Pure white winged divine stallion of Greek mythology' },
  { word: 'MINOTAUR', category: 'MYTHS & MONSTERS', hint: 'Mythical monster with head of a bull trapped inside the Labyrinth' },
  { word: 'KRAKEN', category: 'MYTHS & MONSTERS', hint: 'Colossal tentacled sea monster that drags pirate ships to depths' },
  { word: 'CERBERUS', category: 'MYTHS & MONSTERS', hint: 'Three-headed hound guarding the gates of the underworld' },
  { word: 'MEDUSA', category: 'MYTHS & MONSTERS', hint: 'Gorgon with living snakes for hair whose gaze turns mortals to stone' },
  { word: 'CYCLOPS', category: 'MYTHS & MONSTERS', hint: 'One-eyed giant blacksmith of Greek myth that forged Zeus lightning' },
  { word: 'SPHINX', category: 'MYTHS & MONSTERS', hint: 'Monumental creature with human head and lion body presenting riddles' },
  { word: 'HYDRA', category: 'MYTHS & MONSTERS', hint: 'Multi-headed serpent beast that grows two heads when one is cut' },
  { word: 'CENTAUR', category: 'MYTHS & MONSTERS', hint: 'Mythological creature with head and torso of human and body of horse' },
  { word: 'VAMPIRE', category: 'MYTHS & MONSTERS', hint: 'Immortal creature of night that shuns sunlight and garlic' },
  { word: 'WEREWOLF', category: 'MYTHS & MONSTERS', hint: 'Human shapeshifter that transforms into ferocious wolf under full moon' },
  { word: 'VALKYRIE', category: 'MYTHS & MONSTERS', hint: 'Norse warrior maidens who choose the slain heroes for Valhalla' },

  // 10. NATURE & ADVENTURE
  { word: 'LIGHTNING', category: 'NATURE & ADVENTURE', hint: 'Sudden electrostatic discharge between clouds and ground' },
  { word: 'THUNDER', category: 'NATURE & ADVENTURE', hint: 'Crashing explosive acoustic wave produced by expanding lightning' },
  { word: 'TORNADO', category: 'NATURE & ADVENTURE', hint: 'Rapidly rotating column of violently destructive wind' },
  { word: 'RAINBOW', category: 'NATURE & ADVENTURE', hint: 'Multicolor meteorological arc caused by reflection and refraction in rain' },
  { word: 'WATERFALL', category: 'NATURE & ADVENTURE', hint: 'Cascade where river water drops steeply over rocky cliff' },
  { word: 'BLIZZARD', category: 'NATURE & ADVENTURE', hint: 'Severe snowstorm with freezing high winds and low visibility' },
  { word: 'GLACIER', category: 'NATURE & ADVENTURE', hint: 'Slowly moving monumental river of dense perennial ice' },
  { word: 'SUNFLOWER', category: 'NATURE & ADVENTURE', hint: 'Tall yellow floral plant that turns face toward the warm sun' },
  { word: 'TSUNAMI', category: 'NATURE & ADVENTURE', hint: 'Giant ocean wave generated by undersea earthquakes' },
  { word: 'RAINFOREST', category: 'NATURE & ADVENTURE', hint: 'Dense tropical forest with immense biodiversity and heavy canopy' },
  { word: 'CANYON', category: 'NATURE & ADVENTURE', hint: 'Deep dramatic gorge carved between cliffs by rivers over eons' },
  { word: 'ISLAND', category: 'NATURE & ADVENTURE', hint: 'Land mass completely surrounded on all sides by ocean water' },
  { word: 'JUNGLE', category: 'NATURE & ADVENTURE', hint: 'Tangled tropical wilderness overgrown with thick vegetation' },
  { word: 'CRYSTAL', category: 'NATURE & ADVENTURE', hint: 'Solid mineral whose atoms are arranged in microscopic geometric lattice' },
];

export function getRandomWord(
  category: CategoryType = 'ALL',
  excludeWords: string[] = [],
  excludeCategory?: string
): RescueWord {
  let pool =
    category === 'ALL'
      ? WORD_CATALOG
      : WORD_CATALOG.filter((item) => item.category === category);

  // If category is ALL and an excludeCategory is provided, switch to a different genre every round!
  if (category === 'ALL' && excludeCategory) {
    const diffCategoryPool = pool.filter(
      (item) => item.category.toUpperCase() !== excludeCategory.toUpperCase()
    );
    if (diffCategoryPool.length > 0) {
      pool = diffCategoryPool;
    }
  }

  if (excludeWords && excludeWords.length > 0) {
    const excludeSet = new Set(excludeWords.map((w) => (w || '').trim().toUpperCase()));
    const available = pool.filter((item) => !excludeSet.has(item.word.toUpperCase()));
    if (available.length > 0) {
      const index = Math.floor(Math.random() * available.length);
      return available[index];
    }
  }

  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
