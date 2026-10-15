// Short trophy names for badges and tight lists ("Hart", "Rocket Richard").
const SHORT_NAMES: Record<string, string> = {
  "hart-memorial": "Hart",
  "art-ross": "Art Ross",
  "maurice-richard": "Rocket Richard",
  "ted-lindsay": "Ted Lindsay",
  vezina: "Vezina",
  "james-norris": "Norris",
  "calder-memorial": "Calder",
  "conn-smythe": "Conn Smythe",
  "frank-j-selke": "Selke",
  "lady-byng": "Lady Byng",
  "king-clancey": "King Clancy",
  "bill-masterton": "Masterton",
  "william-m-jennings": "Jennings",
  "mark-messier": "Messier Leadership",
  "foundation-player": "NHL Foundation",
  "jack-adams": "Jack Adams",
  "stanley-cup": "Stanley Cup",
  presidents: "Presidents' Trophy",
};

export function shortTrophyName(slug: string, name: string): string {
  return SHORT_NAMES[slug] ?? name.replace(/ (Memorial )?(Trophy|Award)$/, "");
}
