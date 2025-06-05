import dayjs from "dayjs"

const getLastClassDate = (t) => {
  if (!t || !t.start) return "";

  if (t.repeatAlways === true) return -1;

  const start = dayjs(t.start);

  if (!t.repeatInterval || !t.repeatCnt) {
    return start.format("ddd DD/MM/YYYY HH:mm A");
  }

  const totalDays = t.repeatInterval * t.repeatCnt;
  const end = start.add(totalDays, "day");

  return end.format("ddd DD/MM/YYYY HH:mm A");
};

export {
  getLastClassDate
}