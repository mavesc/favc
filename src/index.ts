import { z } from 'zod';

console.log("Hello from your tspmaker boilerplate!");

const schema = z.object({
    name: z.string(),
});

console.log(schema.parse({ name: "Mauricio" }));
