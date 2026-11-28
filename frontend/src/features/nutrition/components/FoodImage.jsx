const tiles = [
  173424, 171477, 174031, 171986, 171265,
  171284, 172223, 172421, 173735, 173757,
  174271, 169757, 173905, 168070, 170440,
  168216, 171705, 173806, 173944, 170457,
  "huevos-arepa", "pollo-arroz", "yogur-avena", "garbanzos-arroz",
];

export default function FoodImage({ id }) {
  const tile = tiles.indexOf(id);
  if (tile < 0) return null;
  return <div className="nut-image" aria-hidden="true">
    <div style={{ backgroundPosition: `${(tile % 5) * 25}% ${Math.floor(tile / 5) * 25}%` }} />
  </div>;
}
