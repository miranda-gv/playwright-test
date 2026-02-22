import { DateTime } from "luxon";

module.exports = {
  name: 'Monocart Report',
  output: 'test-reports/monocart/index.html',
  format: ({ date: reportDate }: { date: Date }) => {
    return DateTime.fromJSDate(reportDate)
      .setZone("America/New_York")
      .toFormat("yyyy-LL-dd HH:mm:ss z");
  },
};
