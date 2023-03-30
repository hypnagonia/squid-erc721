module.exports = class Data1679942516515 {
    name = 'Data1679942516515'

    async up(db) {
        await db.query(`CREATE TABLE "transfer" ("id" character varying NOT NULL, "from" text NOT NULL, "to" text NOT NULL, "token_id" numeric NOT NULL, "contract" text NOT NULL, "transaction_hash" text NOT NULL, "block_number" numeric NOT NULL, "block_hash" text NOT NULL, "timestamp" numeric NOT NULL, "sent_eth_value" numeric NOT NULL, CONSTRAINT "PK_fd9ddbdd49a17afcbe014401295" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_be54ea276e0f665ffc38630fc0" ON "transfer" ("from") `)
        await db.query(`CREATE INDEX "IDX_4cbc37e8c3b47ded161f44c24f" ON "transfer" ("to") `)
        await db.query(`CREATE INDEX "IDX_5c23fcce4a324e7de2f023d754" ON "transfer" ("contract") `)
        await db.query(`CREATE INDEX "IDX_e8a057744db5ad984bbea97444" ON "transfer" ("transaction_hash") `)
        await db.query(`CREATE INDEX "IDX_d6624eacc30144ea97915fe846" ON "transfer" ("block_number") `)
        await db.query(`CREATE INDEX "IDX_70ff8b624c3118ac3a4862d22c" ON "transfer" ("timestamp") `)
        await db.query(`CREATE TABLE "contract" ("id" character varying NOT NULL, CONSTRAINT "PK_17c3a89f58a2997276084e706e8" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "holder" ("id" character varying NOT NULL, "contract" text NOT NULL, CONSTRAINT "PK_8266ed18d931b168de2723ad322" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_517ff6ff6c9fcdb329af28ed8d" ON "holder" ("contract") `)
    }

    async down(db) {
        await db.query(`DROP TABLE "transfer"`)
        await db.query(`DROP INDEX "public"."IDX_be54ea276e0f665ffc38630fc0"`)
        await db.query(`DROP INDEX "public"."IDX_4cbc37e8c3b47ded161f44c24f"`)
        await db.query(`DROP INDEX "public"."IDX_5c23fcce4a324e7de2f023d754"`)
        await db.query(`DROP INDEX "public"."IDX_e8a057744db5ad984bbea97444"`)
        await db.query(`DROP INDEX "public"."IDX_d6624eacc30144ea97915fe846"`)
        await db.query(`DROP INDEX "public"."IDX_70ff8b624c3118ac3a4862d22c"`)
        await db.query(`DROP TABLE "contract"`)
        await db.query(`DROP TABLE "holder"`)
        await db.query(`DROP INDEX "public"."IDX_517ff6ff6c9fcdb329af28ed8d"`)
    }
}
