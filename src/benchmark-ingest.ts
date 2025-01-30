import axios from 'axios';
import fs from 'node:fs';
import readline from 'node:readline';

if (process.env.MEMOIRE_KEY === undefined){
  throw new Error('set MEMOIRE_KEY')
}

if (process.env.INGESTION_ENDPOINT === undefined){
  throw new Error('set INGESTION_ENDPOINT') 
}

const ingestionEndpoint = process.env.INGESTION_ENDPOINT

/**
 * ingests passages into memoire
 * @param root named params
 * @param root.filePath path to passage collection
 * @param root.batchSize batch size to ingest
 * @returns none
 */
export async function ingestPassages({
  batchSize,
  passageCollectionPath,
}: {
  batchSize: number;
  passageCollectionPath: string;
}): Promise<void> {
  const fileStream = fs.createReadStream(passageCollectionPath);
  const rl = readline.createInterface({
    crlfDelay: Infinity,
    input: fileStream,
  });

  let batch: { content: string; documentID: string }[] = [];

  for await (const line of rl) {
    const [pid, passage] = line.split('\t');
    batch.push({ content: passage, documentID: pid });

    // If batch size is reached, send the batch to the ingestion endpoint
    if (batch.length >= batchSize) {
      await sendBatch(batch);
      batch = [];
    }
  }

  // Send any remaining passages in the last batch
  if (batch.length > 0) {
    await sendBatch(batch);
  }
}

/**
 * Function to send a batch of passages to the ingestion endpoint
 * send batch of docs to memoire
 * @param documents batch of documents to ingest
 */
async function sendBatch(
  documents: { content: string; documentID: string }[],
): Promise<void> {
  try {
    await axios.post(
      ingestionEndpoint,
      { documents },
      {
        headers: {
          Authorization: `Bearer ${process.env.MEMOIRE_KEY}`,
        },
      },
    );
  } catch (error) {
    throw new Error('received error while ingesting to memoire');
  }
}
