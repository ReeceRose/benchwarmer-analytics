using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;

namespace Benchwarmer.Ingestion.Parsers;

public class SkaterCsvParser
{
  public static IEnumerable<SkaterRecord> Parse(string csvContent)
  {
    using var reader = new StringReader(csvContent);
    using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
    {
      MissingFieldFound = null,
      HeaderValidated = null
    });

    return [.. csv.GetRecords<SkaterRecord>()];
  }
}