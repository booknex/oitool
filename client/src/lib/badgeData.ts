import badge1 from "@assets/generated_images/First_Steps_Bronze_Badge_1b939186.png";
import badge2 from "@assets/generated_images/Quick_Learner_Silver_Badge_11e9d157.png";
import badge3 from "@assets/generated_images/Rising_Star_Silver_Badge_1b80a39b.png";
import badge4 from "@assets/generated_images/Dedicated_Warrior_Gold_Badge_4f049950.png";
import badge5 from "@assets/generated_images/Champion's_Path_Elite_Badge_364c19d2.png";
import badge6 from "@assets/generated_images/Legendary_Force_Elite_Badge_d1c8ed1a.png";
import badge7 from "@assets/generated_images/Master_Achiever_Platinum_Badge_150732df.png";
import badge8 from "@assets/generated_images/Elite_Guardian_Platinum_Badge_d498ccfe.png";
import badge9 from "@assets/generated_images/Platinum_Victor_Master_Badge_ac7d58dc.png";
import badge10 from "@assets/generated_images/Diamond_Excellence_Master_Badge_4c0efb04.png";
import badge11 from "@assets/generated_images/Supreme_Legend_Legendary_Badge_002b8e12.png";
import badge12 from "@assets/generated_images/Ultimate_Perfection_Legendary_Badge_c73831a9.png";

import trophy1 from "@assets/generated_images/First_Steps_Bronze_Trophy_a444f60c.png";
import trophy2 from "@assets/generated_images/Quick_Learner_Silver_Trophy_296792fa.png";
import trophy3 from "@assets/generated_images/Rising_Star_Silver_Trophy_8cb633b5.png";
import trophy4 from "@assets/generated_images/Dedicated_Warrior_Gold_Trophy_640e741d.png";
import trophy5 from "@assets/generated_images/Champion's_Path_Elite_Trophy_d26eabe0.png";
import trophy6 from "@assets/generated_images/Legendary_Force_Elite_Trophy_2acb1070.png";
import trophy7 from "@assets/generated_images/Master_Achiever_Platinum_Trophy_5018e15d.png";
import trophy8 from "@assets/generated_images/Elite_Guardian_Platinum_Trophy_8869a8b1.png";
import trophy9 from "@assets/generated_images/Platinum_Victor_Master_Trophy_6136a959.png";
import trophy10 from "@assets/generated_images/Diamond_Excellence_Master_Trophy_aac191b5.png";
import trophy11 from "@assets/generated_images/Supreme_Legend_Legendary_Trophy_add74335.png";
import trophy12 from "@assets/generated_images/Ultimate_Perfection_Legendary_Trophy_1a01ff00.png";

export interface BadgeMetadata {
  id: number;
  name: string;
  description: string;
  category: string;
  badgeImageUrl: string;
  trophyImageUrl: string;
}

export const badgeMetadata: BadgeMetadata[] = [
  {
    id: 1,
    name: "First Steps",
    description: "Begin your journey by unlocking your first achievement",
    category: "Starter",
    badgeImageUrl: badge1,
    trophyImageUrl: trophy1,
  },
  {
    id: 2,
    name: "Quick Learner",
    description: "Master the basics and show your dedication",
    category: "Progress",
    badgeImageUrl: badge2,
    trophyImageUrl: trophy2,
  },
  {
    id: 3,
    name: "Rising Star",
    description: "Prove your skills and climb the ranks",
    category: "Progress",
    badgeImageUrl: badge3,
    trophyImageUrl: trophy3,
  },
  {
    id: 4,
    name: "Dedicated Warrior",
    description: "Show unwavering commitment to excellence",
    category: "Commitment",
    badgeImageUrl: badge4,
    trophyImageUrl: trophy4,
  },
  {
    id: 5,
    name: "Champion's Path",
    description: "Walk the path of champions and legends",
    category: "Elite",
    badgeImageUrl: badge5,
    trophyImageUrl: trophy5,
  },
  {
    id: 6,
    name: "Legendary Force",
    description: "Become a force to be reckoned with",
    category: "Elite",
    badgeImageUrl: badge6,
    trophyImageUrl: trophy6,
  },
  {
    id: 7,
    name: "Master Achiever",
    description: "Demonstrate mastery over all challenges",
    category: "Master",
    badgeImageUrl: badge7,
    trophyImageUrl: trophy7,
  },
  {
    id: 8,
    name: "Elite Guardian",
    description: "Stand among the elite few who reach this tier",
    category: "Elite",
    badgeImageUrl: badge8,
    trophyImageUrl: trophy8,
  },
  {
    id: 9,
    name: "Platinum Victor",
    description: "Achieve victory at the highest levels",
    category: "Master",
    badgeImageUrl: badge9,
    trophyImageUrl: trophy9,
  },
  {
    id: 10,
    name: "Diamond Excellence",
    description: "Reach the pinnacle of achievement",
    category: "Master",
    badgeImageUrl: badge10,
    trophyImageUrl: trophy10,
  },
  {
    id: 11,
    name: "Supreme Legend",
    description: "Ascend to legendary status among peers",
    category: "Legendary",
    badgeImageUrl: badge11,
    trophyImageUrl: trophy11,
  },
  {
    id: 12,
    name: "Ultimate Perfection",
    description: "Complete mastery - the highest honor achievable",
    category: "Legendary",
    badgeImageUrl: badge12,
    trophyImageUrl: trophy12,
  },
];
