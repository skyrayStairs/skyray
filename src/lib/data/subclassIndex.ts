// Structural index of every Player's Handbook subclass: its name, its feature names, and the levels
// they arrive at. No rules text — the descriptions are Wizards' expression and are not reproduced.
// What's here is the shape of the system (names and levels), which is what makes a level-by-level
// scaffold useful at the table, and it ships under Wizards' Fan Content Policy. Write your own
// descriptions into a feature via the subclass editor; those stay in your browser.
//
// ACCURACY: unlike src/lib/assets/data/dnd/classes/**, this is NOT generated from a source document,
// so nothing can verify the names against a book. tests/subclassIndex.spec.ts cross-checks the
// twelve SRD subclasses against the generated SRD data, which catches systematic error but proves
// nothing about the other sixty-four. Proofread against your own PHB and correct what's wrong —
// every entry is editable in the app.

import type { ClassVersion } from '$lib/types/dndClass'

export type SubclassOutline = {
	name: string
	features: { name: string; levels: number[] }[]
}

/** slug -> subclasses, per ruleset. Includes the SRD subclass so the list reads as one whole set. */
export type SubclassIndex = Record<string, SubclassOutline[]>

const f = (name: string, ...levels: number[]) => ({ name, levels })

export const SUBCLASSES_2014: SubclassIndex = {
	barbarian: [
		{
			name: 'Path of the Berserker',
			features: [
				f('Frenzy', 3),
				f('Mindless Rage', 6),
				f('Intimidating Presence', 10),
				f('Retaliation', 14)
			]
		},
		{
			name: 'Path of the Totem Warrior',
			features: [
				f('Spirit Seeker', 3),
				f('Totem Spirit', 3),
				f('Aspect of the Beast', 6),
				f('Spirit Walker', 10),
				f('Totemic Attunement', 14)
			]
		}
	],
	bard: [
		{
			name: 'College of Lore',
			features: [
				f('Bonus Proficiencies', 3),
				f('Cutting Words', 3),
				f('Additional Magical Secrets', 6),
				f('Peerless Skill', 14)
			]
		},
		{
			name: 'College of Valor',
			features: [
				f('Bonus Proficiencies', 3),
				f('Combat Inspiration', 3),
				f('Extra Attack', 6),
				f('Battle Magic', 14)
			]
		}
	],
	cleric: [
		{
			name: 'Knowledge Domain',
			features: [
				f('Bonus Proficiencies', 1),
				f('Blessings of Knowledge', 1),
				f('Channel Divinity: Knowledge of the Ages', 2),
				f('Channel Divinity: Read Thoughts', 6),
				f('Potent Spellcasting', 8),
				f('Visions of the Past', 17)
			]
		},
		{
			name: 'Life Domain',
			features: [
				f('Bonus Proficiency', 1),
				f('Disciple of Life', 1),
				f('Channel Divinity: Preserve Life', 2),
				f('Blessed Healer', 6),
				f('Divine Strike', 8),
				f('Supreme Healing', 17)
			]
		},
		{
			name: 'Light Domain',
			features: [
				f('Bonus Cantrip', 1),
				f('Warding Flare', 1),
				f('Channel Divinity: Radiance of the Dawn', 2),
				f('Improved Flare', 6),
				f('Potent Spellcasting', 8),
				f('Corona of Light', 17)
			]
		},
		{
			name: 'Nature Domain',
			features: [
				f('Acolyte of Nature', 1),
				f('Bonus Proficiency', 1),
				f('Channel Divinity: Charm Animals and Plants', 2),
				f('Dampen Elements', 6),
				f('Divine Strike', 8),
				f('Master of Nature', 17)
			]
		},
		{
			name: 'Tempest Domain',
			features: [
				f('Bonus Proficiencies', 1),
				f('Wrath of the Storm', 1),
				f('Channel Divinity: Destructive Wrath', 2),
				f('Thunderbolt Strike', 6),
				f('Divine Strike', 8),
				f('Stormborn', 17)
			]
		},
		{
			name: 'Trickery Domain',
			features: [
				f('Blessing of the Trickster', 1),
				f('Channel Divinity: Invoke Duplicity', 2),
				f('Channel Divinity: Cloak of Shadows', 6),
				f('Divine Strike', 8),
				f('Improved Duplicity', 17)
			]
		},
		{
			name: 'War Domain',
			features: [
				f('Bonus Proficiencies', 1),
				f('War Priest', 1),
				f('Channel Divinity: Guided Strike', 2),
				f("Channel Divinity: War God's Blessing", 6),
				f('Divine Strike', 8),
				f('Avatar of Battle', 17)
			]
		}
	],
	druid: [
		{
			name: 'Circle of the Land',
			features: [
				f('Bonus Cantrip', 2),
				f('Natural Recovery', 2),
				f('Circle Spells', 3),
				f("Land's Stride", 6),
				f("Nature's Ward", 10),
				f("Nature's Sanctuary", 14)
			]
		},
		{
			name: 'Circle of the Moon',
			features: [
				f('Combat Wild Shape', 2),
				f('Circle Forms', 2),
				f('Primal Strike', 6),
				f('Elemental Wild Shape', 10),
				f('Thousand Forms', 14)
			]
		}
	],
	fighter: [
		{
			name: 'Champion',
			features: [
				f('Improved Critical', 3),
				f('Remarkable Athlete', 7),
				f('Additional Fighting Style', 10),
				f('Superior Critical', 15),
				f('Survivor', 18)
			]
		},
		{
			name: 'Battle Master',
			features: [
				f('Combat Superiority', 3),
				f('Student of War', 3),
				f('Know Your Enemy', 7),
				f('Improved Combat Superiority', 10, 18),
				f('Relentless', 15)
			]
		},
		{
			name: 'Eldritch Knight',
			features: [
				f('Spellcasting', 3),
				f('Weapon Bond', 3),
				f('War Magic', 7),
				f('Eldritch Strike', 10),
				f('Arcane Charge', 15),
				f('Improved War Magic', 18)
			]
		}
	],
	monk: [
		{
			name: 'Way of the Open Hand',
			features: [
				f('Open Hand Technique', 3),
				f('Wholeness of Body', 6),
				f('Tranquility', 11),
				f('Quivering Palm', 17)
			]
		},
		{
			name: 'Way of Shadow',
			features: [
				f('Shadow Arts', 3),
				f('Shadow Step', 6),
				f('Cloak of Shadows', 11),
				f('Opportunist', 17)
			]
		},
		{
			name: 'Way of the Four Elements',
			features: [f('Disciple of the Elements', 3), f('Elemental Disciplines', 3, 6, 11, 17)]
		}
	],
	paladin: [
		{
			name: 'Oath of Devotion',
			features: [
				f('Tenets of Devotion', 3),
				f('Oath Spells', 3),
				f('Channel Divinity', 3),
				f('Aura of Devotion', 7),
				f('Purity of Spirit', 15),
				f('Holy Nimbus', 20)
			]
		},
		{
			name: 'Oath of the Ancients',
			features: [
				f('Tenets of the Ancients', 3),
				f('Oath Spells', 3),
				f('Channel Divinity', 3),
				f('Aura of Warding', 7),
				f('Undying Sentinel', 15),
				f('Elder Champion', 20)
			]
		},
		{
			name: 'Oath of Vengeance',
			features: [
				f('Tenets of Vengeance', 3),
				f('Oath Spells', 3),
				f('Channel Divinity', 3),
				f('Relentless Avenger', 7),
				f('Soul of Vengeance', 15),
				f('Avenging Angel', 20)
			]
		}
	],
	ranger: [
		{
			name: 'Hunter',
			features: [
				f("Hunter's Prey", 3),
				f('Defensive Tactics', 7),
				f('Multiattack', 11),
				f("Superior Hunter's Defense", 15)
			]
		},
		{
			name: 'Beast Master',
			features: [
				f("Ranger's Companion", 3),
				f('Exceptional Training', 7),
				f('Bestial Fury', 11),
				f('Share Spells', 15)
			]
		}
	],
	rogue: [
		{
			name: 'Thief',
			features: [
				f('Fast Hands', 3),
				f('Second-Story Work', 3),
				f('Supreme Sneak', 9),
				f('Use Magic Device', 13),
				f("Thief's Reflexes", 17)
			]
		},
		{
			name: 'Assassin',
			features: [
				f('Bonus Proficiencies', 3),
				f('Assassinate', 3),
				f('Infiltration Expertise', 9),
				f('Impostor', 13),
				f('Death Strike', 17)
			]
		},
		{
			name: 'Arcane Trickster',
			features: [
				f('Spellcasting', 3),
				f('Mage Hand Legerdemain', 3),
				f('Magical Ambush', 9),
				f('Versatile Trickster', 13),
				f('Spell Thief', 17)
			]
		}
	],
	sorcerer: [
		{
			name: 'Draconic Bloodline',
			features: [
				f('Dragon Ancestor', 1),
				f('Draconic Resilience', 1),
				f('Elemental Affinity', 6),
				f('Dragon Wings', 14),
				f('Draconic Presence', 18)
			]
		},
		{
			name: 'Wild Magic',
			features: [
				f('Wild Magic Surge', 1),
				f('Tides of Chaos', 1),
				f('Bend Luck', 6),
				f('Controlled Chaos', 14),
				f('Spell Bombardment', 18)
			]
		}
	],
	warlock: [
		{
			name: 'The Fiend',
			features: [
				f('Expanded Spell List', 1),
				f("Dark One's Blessing", 1),
				f("Dark One's Own Luck", 6),
				f('Fiendish Resilience', 10),
				f('Hurl Through Hell', 14)
			]
		},
		{
			name: 'The Archfey',
			features: [
				f('Expanded Spell List', 1),
				f('Fey Presence', 1),
				f('Misty Escape', 6),
				f('Beguiling Defenses', 10),
				f('Dark Delirium', 14)
			]
		},
		{
			name: 'The Great Old One',
			features: [
				f('Expanded Spell List', 1),
				f('Awakened Mind', 1),
				f('Entropic Ward', 6),
				f('Thought Shield', 10),
				f('Create Thrall', 14)
			]
		}
	],
	wizard: [
		{
			name: 'School of Abjuration',
			features: [
				f('Abjuration Savant', 2),
				f('Arcane Ward', 2),
				f('Projected Ward', 6),
				f('Improved Abjuration', 10),
				f('Spell Resistance', 14)
			]
		},
		{
			name: 'School of Conjuration',
			features: [
				f('Conjuration Savant', 2),
				f('Minor Conjuration', 2),
				f('Benign Transposition', 6),
				f('Focused Conjuration', 10),
				f('Durable Summons', 14)
			]
		},
		{
			name: 'School of Divination',
			features: [
				f('Divination Savant', 2),
				f('Portent', 2),
				f('Expert Divination', 6),
				f('The Third Eye', 10),
				f('Greater Portent', 14)
			]
		},
		{
			name: 'School of Enchantment',
			features: [
				f('Enchantment Savant', 2),
				f('Hypnotic Gaze', 2),
				f('Instinctive Charm', 6),
				f('Split Enchantment', 10),
				f('Alter Memories', 14)
			]
		},
		{
			name: 'School of Evocation',
			features: [
				f('Evocation Savant', 2),
				f('Sculpt Spells', 2),
				f('Potent Cantrip', 6),
				f('Empowered Evocation', 10),
				f('Overchannel', 14)
			]
		},
		{
			name: 'School of Illusion',
			features: [
				f('Illusion Savant', 2),
				f('Improved Minor Illusion', 2),
				f('Malleable Illusions', 6),
				f('Illusory Self', 10),
				f('Illusory Reality', 14)
			]
		},
		{
			name: 'School of Necromancy',
			features: [
				f('Necromancy Savant', 2),
				f('Grim Harvest', 2),
				f('Undead Thralls', 6),
				f('Inured to Undeath', 10),
				f('Command Undead', 14)
			]
		},
		{
			name: 'School of Transmutation',
			features: [
				f('Transmutation Savant', 2),
				f('Minor Alchemy', 2),
				f("Transmuter's Stone", 6),
				f('Shapechanger', 10),
				f('Master Transmuter', 14)
			]
		}
	]
}

export const SUBCLASSES_2024: SubclassIndex = {
	barbarian: [
		{
			name: 'Path of the Berserker',
			features: [
				f('Frenzy', 3),
				f('Mindless Rage', 6),
				f('Retaliation', 10),
				f('Intimidating Presence', 14)
			]
		},
		{
			name: 'Path of the Wild Heart',
			features: [
				f('Animal Speaker', 3),
				f('Rage of the Wilds', 3),
				f('Aspect of the Wilds', 6),
				f('Nature Speaker', 10),
				f('Power of the Wilds', 14)
			]
		},
		{
			name: 'Path of the World Tree',
			features: [
				f('Vitality of the Tree', 3),
				f('Branches of the Tree', 6),
				f('Battering Roots', 10),
				f('Travel along the Tree', 14)
			]
		},
		{
			name: 'Path of the Zealot',
			features: [
				f('Divine Fury', 3),
				f('Warrior of the Gods', 3),
				f('Fanatical Focus', 6),
				f('Zealous Presence', 10),
				f('Rage beyond Death', 14)
			]
		}
	],
	bard: [
		{
			name: 'College of Dance',
			features: [
				f('Dazzling Footwork', 3),
				f('Inspiring Movement', 6),
				f('Tandem Footwork', 6),
				f('Leading Evasion', 14)
			]
		},
		{
			name: 'College of Glamour',
			features: [
				f('Beguiling Magic', 3),
				f('Mantle of Inspiration', 3),
				f('Mantle of Majesty', 6),
				f('Unbreakable Majesty', 14)
			]
		},
		{
			name: 'College of Lore',
			features: [
				f('Bonus Proficiencies', 3),
				f('Cutting Words', 3),
				f('Magical Discoveries', 6),
				f('Peerless Skill', 14)
			]
		},
		{
			name: 'College of Valor',
			features: [
				f('Combat Inspiration', 3),
				f('Martial Training', 3),
				f('Extra Attack', 6),
				f('Battle Magic', 14)
			]
		}
	],
	cleric: [
		{
			name: 'Life Domain',
			features: [
				f('Disciple of Life', 3),
				f('Life Domain Spells', 3),
				f('Preserve Life', 3),
				f('Blessed Healer', 6),
				f('Supreme Healing', 17)
			]
		},
		{
			name: 'Light Domain',
			features: [
				f('Light Domain Spells', 3),
				f('Radiance of the Dawn', 3),
				f('Warding Flare', 3),
				f('Improved Warding Flare', 6),
				f('Potent Spellcasting', 17),
				f('Corona of Light', 17)
			]
		},
		{
			name: 'Trickery Domain',
			features: [
				f('Blessing of the Trickster', 3),
				f('Invoke Duplicity', 3),
				f('Trickery Domain Spells', 3),
				f("Trickster's Transposition", 6),
				f('Improved Duplicity', 17)
			]
		},
		{
			name: 'War Domain',
			features: [
				f('Guided Strike', 3),
				f('War Domain Spells', 3),
				f('War Priest', 3),
				f("War God's Blessing", 6),
				f('Divine Strike', 17),
				f('Avatar of Battle', 17)
			]
		}
	],
	druid: [
		{
			name: 'Circle of the Land',
			features: [
				f('Circle of the Land Spells', 3),
				f("Land's Aid", 3),
				f('Natural Recovery', 6),
				f("Nature's Ward", 10),
				f("Nature's Sanctuary", 14)
			]
		},
		{
			name: 'Circle of the Moon',
			features: [
				f('Circle Forms', 3),
				f('Circle of the Moon Spells', 3),
				f('Improved Circle Forms', 6),
				f('Moonlight Step', 10),
				f('Lunar Form', 14)
			]
		},
		{
			name: 'Circle of the Sea',
			features: [
				f('Circle of the Sea Spells', 3),
				f('Wrath of the Sea', 3),
				f('Aquatic Affinity', 6),
				f('Stormborn', 10),
				f('Oceanic Gift', 14)
			]
		},
		{
			name: 'Circle of the Stars',
			features: [
				f('Star Map', 3),
				f('Starry Form', 3),
				f('Cosmic Omen', 6),
				f('Twinkling Constellations', 10),
				f('Full of Stars', 14)
			]
		}
	],
	fighter: [
		{
			name: 'Battle Master',
			features: [
				f('Combat Superiority', 3),
				f('Student of War', 3),
				f('Know Your Enemy', 7),
				f('Improved Combat Superiority', 10, 18),
				f('Relentless', 15)
			]
		},
		{
			name: 'Champion',
			features: [
				f('Improved Critical', 3),
				f('Remarkable Athlete', 3),
				f('Additional Fighting Style', 7),
				f('Heroic Warrior', 10),
				f('Superior Critical', 15),
				f('Survivor', 18)
			]
		},
		{
			name: 'Eldritch Knight',
			features: [
				f('Spellcasting', 3),
				f('War Bond', 3),
				f('War Magic', 7),
				f('Eldritch Strike', 10),
				f('Arcane Charge', 15),
				f('Improved War Magic', 18)
			]
		},
		{
			name: 'Psi Warrior',
			features: [
				f('Psionic Power', 3),
				f('Telekinetic Adept', 7),
				f('Guarded Mind', 10),
				f('Bulwark of Force', 15),
				f('Telekinetic Master', 18)
			]
		}
	],
	monk: [
		{
			name: 'Warrior of Mercy',
			features: [
				f('Hand of Harm', 3),
				f('Hand of Healing', 3),
				f("Physician's Touch", 6),
				f('Flurry of Healing and Harm', 11),
				f('Hand of Ultimate Mercy', 17)
			]
		},
		{
			name: 'Warrior of Shadow',
			features: [
				f('Shadow Arts', 3),
				f('Shadow Step', 6),
				f('Improved Shadow Step', 11),
				f('Cloak of Shadows', 17)
			]
		},
		{
			name: 'Warrior of the Elements',
			features: [
				f('Elemental Attunement', 3),
				f('Manipulate Elements', 6),
				f('Stride of the Elements', 11),
				f('Elemental Epitome', 17)
			]
		},
		{
			name: 'Warrior of the Open Hand',
			features: [
				f('Open Hand Technique', 3),
				f('Wholeness of Body', 6),
				f('Fleet Step', 11),
				f('Quivering Palm', 17)
			]
		}
	],
	paladin: [
		{
			name: 'Oath of Devotion',
			features: [
				f('Oath of Devotion Spells', 3),
				f('Sacred Weapon', 3),
				f('Aura of Devotion', 7),
				f('Smite of Protection', 15),
				f('Holy Nimbus', 20)
			]
		},
		{
			name: 'Oath of Glory',
			features: [
				f('Inspiring Smite', 3),
				f('Oath of Glory Spells', 3),
				f('Peerless Athlete', 3),
				f('Aura of Alacrity', 7),
				f('Glorious Defense', 15),
				f('Living Legend', 20)
			]
		},
		{
			name: 'Oath of the Ancients',
			features: [
				f("Nature's Wrath", 3),
				f('Oath of the Ancients Spells', 3),
				f('Aura of Warding', 7),
				f('Undying Sentinel', 15),
				f('Elder Champion', 20)
			]
		},
		{
			name: 'Oath of Vengeance',
			features: [
				f('Oath of Vengeance Spells', 3),
				f('Vow of Enmity', 3),
				f('Relentless Avenger', 7),
				f('Soul of Vengeance', 15),
				f('Avenging Angel', 20)
			]
		}
	],
	ranger: [
		{
			name: 'Beast Master',
			features: [
				f('Primal Companion', 3),
				f('Exceptional Training', 7),
				f('Bestial Fury', 11),
				f('Share Spells', 15)
			]
		},
		{
			name: 'Fey Wanderer',
			features: [
				f('Dreadful Strikes', 3),
				f('Fey Wanderer Spells', 3),
				f('Otherworldly Glamour', 3),
				f('Beguiling Twist', 7),
				f('Fey Reinforcements', 11),
				f('Misty Wanderer', 15)
			]
		},
		{
			name: 'Gloom Stalker',
			features: [
				f('Dread Ambusher', 3),
				f('Gloom Stalker Spells', 3),
				f('Umbral Sight', 3),
				f('Iron Mind', 7),
				f("Stalker's Flurry", 11),
				f('Shadowy Dodge', 15)
			]
		},
		{
			name: 'Hunter',
			features: [
				f("Hunter's Lore", 3),
				f("Hunter's Prey", 3),
				f('Defensive Tactics', 7),
				f("Superior Hunter's Prey", 11),
				f("Superior Hunter's Defense", 15)
			]
		}
	],
	rogue: [
		{
			name: 'Arcane Trickster',
			features: [
				f('Mage Hand Legerdemain', 3),
				f('Spellcasting', 3),
				f('Magical Ambush', 9),
				f('Versatile Trickster', 13),
				f('Spell Thief', 17)
			]
		},
		{
			name: 'Assassin',
			features: [
				f('Assassinate', 3),
				f("Assassin's Tools", 3),
				f('Infiltration Expertise', 9),
				f('Envenom Weapons', 13),
				f('Death Strike', 17)
			]
		},
		{
			name: 'Soulknife',
			features: [
				f('Psionic Power', 3),
				f('Psychic Blades', 3),
				f('Soul Blades', 9),
				f('Psychic Veil', 13),
				f('Rend Mind', 17)
			]
		},
		{
			name: 'Thief',
			features: [
				f('Fast Hands', 3),
				f('Second-Story Work', 3),
				f('Supreme Sneak', 9),
				f('Use Magic Device', 13),
				f("Thief's Reflexes", 17)
			]
		}
	],
	sorcerer: [
		{
			name: 'Aberrant Sorcery',
			features: [
				f('Psionic Spells', 3),
				f('Telepathic Speech', 3),
				f('Psionic Sorcery', 6),
				f('Psychic Defenses', 6),
				f('Revelation in Flesh', 14),
				f('Warping Implosion', 18)
			]
		},
		{
			name: 'Clockwork Sorcery',
			features: [
				f('Clockwork Spells', 3),
				f('Restore Balance', 3),
				f('Bastion of Law', 6),
				f('Trance of Order', 14),
				f('Clockwork Cavalcade', 18)
			]
		},
		{
			name: 'Draconic Sorcery',
			features: [
				f('Draconic Resilience', 3),
				f('Draconic Spells', 3),
				f('Elemental Affinity', 6),
				f('Dragon Wings', 14),
				f('Dragon Companion', 18)
			]
		},
		{
			name: 'Wild Magic Sorcery',
			features: [
				f('Wild Magic Surge', 3),
				f('Tides of Chaos', 3),
				f('Bend Luck', 6),
				f('Controlled Chaos', 14),
				f('Tamed Surge', 18)
			]
		}
	],
	warlock: [
		{
			name: 'Archfey Patron',
			features: [
				f('Archfey Spells', 3),
				f('Steps of the Fey', 3),
				f('Misty Escape', 6),
				f('Beguiling Defenses', 10),
				f('Bewitching Magic', 14)
			]
		},
		{
			name: 'Celestial Patron',
			features: [
				f('Celestial Spells', 3),
				f('Healing Light', 3),
				f('Radiant Soul', 3),
				f('Celestial Resilience', 6),
				f('Searing Vengeance', 10),
				f('Celestial Aid', 14)
			]
		},
		{
			name: 'Fiend Patron',
			features: [
				f("Dark One's Blessing", 3),
				f('Fiend Spells', 3),
				f("Dark One's Own Luck", 6),
				f('Fiendish Resilience', 10),
				f('Hurl Through Hell', 14)
			]
		},
		{
			name: 'Great Old One Patron',
			features: [
				f('Awakened Mind', 3),
				f('Great Old One Spells', 3),
				f('Psychic Spells', 3),
				f('Clairvoyant Combatant', 6),
				f('Eldritch Hex', 10),
				f('Create Thrall', 14)
			]
		}
	],
	wizard: [
		{
			name: 'Abjurer',
			features: [
				f('Abjuration Savant', 3),
				f('Arcane Ward', 3),
				f('Projected Ward', 6),
				f('Spell Breaker', 10),
				f('Spell Resistance', 14)
			]
		},
		{
			name: 'Diviner',
			features: [
				f('Divination Savant', 3),
				f('Portent', 3),
				f('Expert Divination', 6),
				f('The Third Eye', 10),
				f('Greater Portent', 14)
			]
		},
		{
			name: 'Evoker',
			features: [
				f('Evocation Savant', 3),
				f('Potent Cantrip', 3),
				f('Sculpt Spells', 6),
				f('Empowered Evocation', 10),
				f('Overchannel', 14)
			]
		},
		{
			name: 'Illusionist',
			features: [
				f('Illusion Savant', 3),
				f('Improved Illusions', 3),
				f('Phantasmal Creatures', 6),
				f('Illusory Self', 10),
				f('Illusory Reality', 14)
			]
		}
	]
}

export function subclassIndex(version: ClassVersion): SubclassIndex {
	return version === '2024' ? SUBCLASSES_2024 : SUBCLASSES_2014
}
