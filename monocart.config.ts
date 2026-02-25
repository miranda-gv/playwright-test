
//This is where we will configure the Monocart report settings, such as the name, output location, and any custom formatting for the report date.
// Yet to be implemented

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
