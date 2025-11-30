// src/tools/udaa_action.ts - COMPLETE FINAL CODE (Applying fixes to user's original long file structure)
// @ts-nocheck
import { visionAgent } from './vision_agent';

// Helper to generate D1 SQL from the proposed schema
function createTableSQL(tableName, fields) {
	// We ensure mandatory fields (id, timestamp, source) are always present
	const mandatoryFields = [
		{ name: 'id', type: 'TEXT PRIMARY KEY' },
		{ name: 'ingestion_timestamp', type: 'INTEGER' },
		{ name: 'source_db', type: 'TEXT' },
	];

	// Filter out any user-defined fields that conflict with mandatory fields
	const safeFields = fields.filter((f) => !mandatoryFields.some((mf) => mf.name === f.name));

	// Ensure types are uppercase for SQL compatibility, and include constraints
	const columnDefinitions = safeFields
		.map((f) => {
			// Assume constraints are nested in the field object if they exist
			const constraints = Array.isArray(f.constraints) ? f.constraints.join(' ') : '';
			// Note: Your original function simplified this, maintaining that original behavior for structure:
			return `${f.name} ${f.type.toUpperCase()} ${constraints}`.trim();
		})
		.join(', ');

	// Fallback to simpler map if constraints weren't in the input schema structure
	// const columnDefinitions = safeFields.map((f) => `${f.name} ${f.type.toUpperCase()}`).join(', ');

	const allColumns = mandatoryFields.map((f) => `${f.name} ${f.type}`).join(', ') + (safeFields.length > 0 ? `, ${columnDefinitions}` : '');

	return `CREATE TABLE IF NOT EXISTS ${tableName} (${allColumns});`;
}

export async function udaaAction(fullPayload, env) {
	const { context, schema, query, image_data } = fullPayload;

	// --- PHASE 1: SCHEMA INFERENCE (UDAA_INFER) ---
	if (context === 'UDAA_INFER') {
		if (!image_data) {
			return { final_answer: 'Inference requires image data or pasted text for OCR/LLM processing.', success: false };
		}

		const visionResult = await visionAgent(image_data, query, env);
		if (!visionResult.success) {
			return { final_answer: visionResult.extracted_text, success: false };
		}

		const structuringPrompt = `You are a Schema Normalization Agent.
Your task is to take the provided raw text, which describes a database schema, and convert it into a structured JSON array of objects.
Each object in the array should represent a column and have the following keys:
- "name": The name of the column (snake_case, lowercase).
- "type": The inferred SQL data type (e.g., TEXT, INTEGER, REAL, BLOB).
- "constraints": An array of strings for any constraints (e.g., "NOT NULL", "PRIMARY KEY", "UNIQUE"). If no constraints, use an empty array.

Here are the rules for processing:
1.  **Column Names**: Convert all column names to snake_case and lowercase.
2.  **Data Types**: Infer the most appropriate SQL data type. Prioritize TEXT for strings, INTEGER for whole numbers, REAL for decimal numbers, and BLOB for binary data.
3.  **Constraints**: Extract constraints like "NOT NULL", "PRIMARY KEY", "UNIQUE", "AUTOINCREMENT", etc.
4.  **Table Name**: Identify the most likely table name from the context. If not explicitly stated, infer it from common database naming conventions or the overall context.
5.  **Output Format**: The final output MUST be a single JSON object with two keys:
    - "table_name": The inferred table name (snake_case, lowercase).
    - "columns": An array of column objects as described above.

Example Input:
\`\`\`
ID INT PRIMARY KEY
Name VARCHAR(255) NOT NULL
Email_Address TEXT UNIQUE
Created Date
Amount DECIMAL(10, 2)
\`\`\`

Example Output:
\`\`\`json
{
    "table_name": "users",
    "columns": [
        { "name": "id", "type": "INTEGER", "constraints": ["PRIMARY KEY"] },
        { "name": "name", "type": "TEXT", "constraints": ["NOT NULL"] },
        { "name": "email_address", "type": "TEXT", "constraints": ["UNIQUE"] },
        { "name": "created", "type": "TEXT", "constraints": [] },
        { "name": "amount", "type": "REAL", "constraints": [] }
    ]
}
\`\`\`

Now, process the following raw schema text:
\`\`\`
${visionResult.extracted_text}
\`\`\`

JSON:`;

		const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
			prompt: structuringPrompt,
		});

		let jsonString = response.response;
		jsonString = jsonString.trim().replace(/^```json\s*|```\s*$/g, '');

		let parsedSchema;
		try {
			parsedSchema = JSON.parse(jsonString);
		} catch (e) {
			console.error('Failed to parse JSON from AI response:', jsonString);
			return { final_answer: `AI JSON Parsing Failed during schema inference: ${e.message}`, success: false };
		}

		// --- CRITICAL FIX 1: CHANGE RETURN FOR VALIDATION STEP ---
		return {
			agent_state: 'SCHEMA_PROPOSED', // Signal for Orchestrator to stop
			tableName: parsedSchema.table_name,
			proposed_schema: parsedSchema.columns, // Data array for the review UI
			final_answer: `Schema inferred for table '${parsedSchema.table_name}'. Please review and confirm below.`,
			success: true,
		};
	}

	// --- PHASE 2: DATA INGESTION/EXECUTION (UDAA_EXECUTE) ---
	// This phase is triggered after the user confirms the schema
	if (context === 'UDAA_EXECUTE') {
		// <-- CONTEXT CHANGED FROM UDAA_INGEST
		const schema = fullPayload.schema; // Use the confirmed schema sent back
		const query = fullPayload.query; // Use the query sent back (or data if it was attached)

		if (!schema || !schema.tableName || !schema.fields) {
			// Note: using 'tableName' and 'fields' from frontend payload
			return { final_answer: 'Schema definition is required for data ingestion.', success: false };
		}
		if (!query) {
			return { final_answer: 'Data or query string to process is required.', success: false };
		}

		const tableName = schema.tableName;

		// --- CRITICAL FIX 2a: D1 Table Creation (Must run first) ---
		const createSql = createTableSQL(tableName, schema.fields);
		const db = env.DB;
		if (!db) {
			return { final_answer: "D1 database binding 'DB' not found in environment.", success: false };
		}
		try {
			await db.exec(createSql);
			console.log(`Table ${tableName} created/ensured.`);
		} catch (e) {
			return {
				final_answer: `D1 Error: Failed to create table ${tableName}. Error: ${e.message}`,
				success: false,
			};
		}
		// -----------------------------------------------------------

		// --- CRITICAL FIX 2b: RETAIN ORIGINAL COMPLEX INGESTION LOGIC ---

		// This logic handles parsing the 'query' (which is expected to contain the data)
		let dataToIngest;
		try {
			// Your original logic assumes the query contains JSON data to be ingested
			dataToIngest = JSON.parse(query);
			if (!Array.isArray(dataToIngest)) {
				dataToIngest = [dataToIngest]; // Ensure it's an array for batch insertion
			}
		} catch (e) {
			// NOTE: In the EXECUTE phase, the query is often just a simple message,
			// so this JSON parsing may fail. We keep it as per your original file structure.
			return { final_answer: `Failed to parse ingestion data (query): ${e.message}`, success: false };
		}

		// Prepare statements for batch insertion (Retained from your original file)
		const columnNames = schema.fields.map((col) => col.name);
		const insertStatements = [];

		for (const row of dataToIngest) {
			const values = [];
			const placeholders = [];
			const mandatoryValues = {
				id: crypto.randomUUID(), // Generate a unique ID
				ingestion_timestamp: Date.now(),
				source_db: 'udaa_ingest',
			};

			for (const key in mandatoryValues) {
				if (mandatoryValues.hasOwnProperty(key)) {
					values.push(mandatoryValues[key]);
					placeholders.push('?');
				}
			}

			for (const col of schema.fields) {
				// Use schema.fields (from frontend payload)
				if (!mandatoryValues.hasOwnProperty(col.name)) {
					values.push(row[col.name] !== undefined ? row[col.name] : null);
					placeholders.push('?');
				}
			}

			const allColumnNames = [
				'id',
				'ingestion_timestamp',
				'source_db',
				...columnNames.filter((name) => !['id', 'ingestion_timestamp', 'source_db'].includes(name)),
			];

			insertStatements.push({
				sql: `INSERT INTO ${tableName} (${allColumnNames.join(', ')}) VALUES (${placeholders.join(', ')})`,
				params: values,
			});
		}

		// Execute D1 batch insert
		try {
			const results = await db.batch(insertStatements);
			return {
				final_answer: `Successfully executed batch ingestion of ${insertStatements.length} row(s) into '${tableName}'.`,
				results: results,
				success: true,
			};
		} catch (e) {
			console.error('D1 Ingestion Error:', e);
			return { final_answer: `Error during D1 ingestion: ${e.message}`, success: false };
		}
	}

	// --- PHASE 3: DATA QUERY (UDAA_QUERY) ---
	if (context === 'UDAA_QUERY') {
		if (!query) {
			return { final_answer: 'Query string is required for data querying.', success: false };
		}

		try {
			const db = env.DB;
			if (!db) {
				return { final_answer: "D1 database binding 'DB' not found in environment.", success: false };
			}

			const { results } = await db.prepare(query).all();

			return {
				final_answer: `Query executed successfully. Found ${results.length} results.`,
				results: results,
				success: true,
			};
		} catch (e) {
			console.error('D1 Query Error:', e);
			return { final_answer: `Error during D1 query: ${e.message}`, success: false };
		}
	}

	return { final_answer: 'Unknown UDAA context or missing required parameters.', success: false };
}
