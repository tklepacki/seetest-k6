export function getRandomNumber() {
  const min = 0.0
  const max = 100.0
  return Math.random() * (max - min) + min;
}

export function getRandomUserNumber() {
  const min = 0
  const max = 4
  return Math.floor(Math.random() * (max - min + 1)) + min
}
