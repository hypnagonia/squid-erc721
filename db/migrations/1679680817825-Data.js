module.exports = class Data1679680817825 {
    name = 'Data1679680817825'

    async up(db) {
        await db.query(`CREATE TABLE "transfer" ("id" character varying NOT NULL, "from" text NOT NULL, "to" text NOT NULL, "token_id" numeric NOT NULL, "contract" text NOT NULL, "transaction_hash" text NOT NULL, "block_number" numeric NOT NULL, "block_hash" text NOT NULL, "timestamp" numeric NOT NULL, CONSTRAINT "PK_fd9ddbdd49a17afcbe014401295" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_e8a057744db5ad984bbea97444" ON "transfer" ("transaction_hash") `)
        await db.query(`CREATE INDEX "IDX_d6624eacc30144ea97915fe846" ON "transfer" ("block_number") `)
        await db.query(`CREATE INDEX "IDX_70ff8b624c3118ac3a4862d22c" ON "transfer" ("timestamp") `)
        await db.query(`CREATE TABLE "contract" ("id" character varying NOT NULL, "name" text NOT NULL, "symbol" text NOT NULL, CONSTRAINT "PK_17c3a89f58a2997276084e706e8" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_973644690f8ec06af4eebfd3a8" ON "contract" ("name") `)
        await db.query(`CREATE INDEX "IDX_ae5c59dd42750a76aba50d9504" ON "contract" ("symbol") `)
        await db.query(`CREATE TABLE "holder" ("id" character varying NOT NULL, CONSTRAINT "PK_8266ed18d931b168de2723ad322" PRIMARY KEY ("id"))`)
    }

    async down(db) {
        await db.query(`DROP TABLE "transfer"`)
        await db.query(`DROP INDEX "public"."IDX_e8a057744db5ad984bbea97444"`)
        await db.query(`DROP INDEX "public"."IDX_d6624eacc30144ea97915fe846"`)
        await db.query(`DROP INDEX "public"."IDX_70ff8b624c3118ac3a4862d22c"`)
        await db.query(`DROP TABLE "contract"`)
        await db.query(`DROP INDEX "public"."IDX_973644690f8ec06af4eebfd3a8"`)
        await db.query(`DROP INDEX "public"."IDX_ae5c59dd42750a76aba50d9504"`)
        await db.query(`DROP TABLE "holder"`)
    }
}
