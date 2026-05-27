import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommunityAndMarketplace1700000000012 implements MigrationInterface {
  name = 'CreateCommunityAndMarketplace1700000000012';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Community Groups ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "community_groups_category_enum" AS ENUM('CROP_TYPE','REGION','INTEREST','GENERAL')
    `);
    await queryRunner.query(`
      CREATE TABLE "community_groups" (
        "id"              UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "name"            VARCHAR           NOT NULL,
        "description"     TEXT,
        "category"        "community_groups_category_enum" NOT NULL DEFAULT 'GENERAL',
        "cover_image_url" VARCHAR,
        "created_by_id"   UUID,
        "member_count"    INT               NOT NULL DEFAULT 0,
        "is_private"      BOOLEAN           NOT NULL DEFAULT false,
        "tags"            TEXT,
        "created_at"      TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "pk_community_groups" PRIMARY KEY ("id"),
        CONSTRAINT "fk_community_groups_creator"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_community_groups_category" ON "community_groups" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_community_groups_creator" ON "community_groups" ("created_by_id")`,
    );

    // ── Group Memberships ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "group_memberships_role_enum" AS ENUM('MEMBER','MODERATOR','ADMIN')
    `);
    await queryRunner.query(`
      CREATE TABLE "group_memberships" (
        "id"        UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"   UUID        NOT NULL,
        "group_id"  UUID        NOT NULL,
        "role"      "group_memberships_role_enum" NOT NULL DEFAULT 'MEMBER',
        "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_group_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "uq_group_memberships_user_group" UNIQUE ("user_id","group_id"),
        CONSTRAINT "fk_group_memberships_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_group_memberships_group"
          FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_group_memberships_user" ON "group_memberships" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_group_memberships_group" ON "group_memberships" ("group_id")`,
    );

    // ── Community Posts ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "community_posts_type_enum" AS ENUM('GENERAL','QUESTION','TIP','TRADE')
    `);
    await queryRunner.query(`
      CREATE TYPE "community_posts_status_enum" AS ENUM('ACTIVE','REMOVED','FLAGGED')
    `);
    await queryRunner.query(`
      CREATE TABLE "community_posts" (
        "id"            UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "author_id"     UUID        NOT NULL,
        "group_id"      UUID,
        "content"       TEXT        NOT NULL,
        "title"         VARCHAR,
        "type"          "community_posts_type_enum" NOT NULL DEFAULT 'GENERAL',
        "status"        "community_posts_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "image_url"     VARCHAR,
        "tags"          TEXT,
        "like_count"    INT         NOT NULL DEFAULT 0,
        "comment_count" INT         NOT NULL DEFAULT 0,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_community_posts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_community_posts_author"
          FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_community_posts_author" ON "community_posts" ("author_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_community_posts_group" ON "community_posts" ("group_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_community_posts_status" ON "community_posts" ("status")`,
    );

    // ── Community Comments ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "community_comments" (
        "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "post_id"    UUID        NOT NULL,
        "author_id"  UUID        NOT NULL,
        "content"    TEXT        NOT NULL,
        "parent_id"  UUID,
        "like_count" INT         NOT NULL DEFAULT 0,
        "is_removed" BOOLEAN     NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_community_comments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_community_comments_post"
          FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_community_comments_author"
          FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_community_comments_post" ON "community_comments" ("post_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_community_comments_author" ON "community_comments" ("author_id")`,
    );

    // ── Post Reactions ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "post_reactions_type_enum" AS ENUM('LIKE','HELPFUL','INSIGHTFUL')
    `);
    await queryRunner.query(`
      CREATE TABLE "post_reactions" (
        "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    UUID        NOT NULL,
        "post_id"    UUID        NOT NULL,
        "type"       "post_reactions_type_enum" NOT NULL DEFAULT 'LIKE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_post_reactions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_post_reactions_user_post" UNIQUE ("user_id","post_id"),
        CONSTRAINT "fk_post_reactions_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_post_reactions_post"
          FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_post_reactions_post" ON "post_reactions" ("post_id")`,
    );

    // ── Co-Op Listings ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "coop_listings_category_enum" AS ENUM('CROPS','SEEDS','TOOLS','SERVICES','LIVESTOCK','OTHER')
    `);
    await queryRunner.query(`
      CREATE TYPE "coop_listings_status_enum" AS ENUM('ACTIVE','SOLD','RESERVED','EXPIRED','REMOVED')
    `);
    await queryRunner.query(`
      CREATE TYPE "coop_listings_delivery_option_enum" AS ENUM('PICKUP_ONLY','DELIVERY','BOTH')
    `);
    await queryRunner.query(`
      CREATE TABLE "coop_listings" (
        "id"              UUID            NOT NULL DEFAULT uuid_generate_v4(),
        "seller_id"       UUID            NOT NULL,
        "title"           VARCHAR         NOT NULL,
        "description"     TEXT            NOT NULL,
        "category"        "coop_listings_category_enum"  NOT NULL DEFAULT 'CROPS',
        "status"          "coop_listings_status_enum"    NOT NULL DEFAULT 'ACTIVE',
        "price"           DECIMAL(18,2)   NOT NULL,
        "currency"        VARCHAR         NOT NULL DEFAULT 'USD',
        "quantity"        DECIMAL(10,2)   NOT NULL,
        "unit"            VARCHAR         NOT NULL DEFAULT 'kg',
        "delivery_option" "coop_listings_delivery_option_enum" NOT NULL DEFAULT 'PICKUP_ONLY',
        "location"        VARCHAR,
        "image_url"       VARCHAR,
        "expires_at"      TIMESTAMPTZ,
        "view_count"      INT             NOT NULL DEFAULT 0,
        "created_at"      TIMESTAMPTZ     NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ     NOT NULL DEFAULT now(),
        CONSTRAINT "pk_coop_listings" PRIMARY KEY ("id"),
        CONSTRAINT "fk_coop_listings_seller"
          FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_coop_listings_seller" ON "coop_listings" ("seller_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_coop_listings_status" ON "coop_listings" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_coop_listings_category" ON "coop_listings" ("category")`,
    );

    // ── Co-Op Orders ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "coop_orders_status_enum" AS ENUM('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED','DISPUTED')
    `);
    await queryRunner.query(`
      CREATE TABLE "coop_orders" (
        "id"               UUID            NOT NULL DEFAULT uuid_generate_v4(),
        "listing_id"       UUID            NOT NULL,
        "buyer_id"         UUID            NOT NULL,
        "seller_id"        UUID            NOT NULL,
        "quantity"         DECIMAL(10,2)   NOT NULL,
        "total_price"      DECIMAL(18,2)   NOT NULL,
        "status"           "coop_orders_status_enum" NOT NULL DEFAULT 'PENDING',
        "notes"            TEXT,
        "delivery_address" VARCHAR,
        "confirmed_at"     TIMESTAMPTZ,
        "delivered_at"     TIMESTAMPTZ,
        "created_at"       TIMESTAMPTZ     NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ     NOT NULL DEFAULT now(),
        CONSTRAINT "pk_coop_orders" PRIMARY KEY ("id"),
        CONSTRAINT "fk_coop_orders_listing"
          FOREIGN KEY ("listing_id") REFERENCES "coop_listings"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_coop_orders_buyer"
          FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_coop_orders_seller"
          FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_coop_orders_buyer" ON "coop_orders" ("buyer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_coop_orders_seller" ON "coop_orders" ("seller_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_coop_orders_listing" ON "coop_orders" ("listing_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_coop_orders_status" ON "coop_orders" ("status")`,
    );

    // ── Co-Op Reviews ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "coop_reviews" (
        "id"           UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "order_id"     UUID        NOT NULL,
        "reviewer_id"  UUID        NOT NULL,
        "reviewee_id"  UUID        NOT NULL,
        "rating"       INT         NOT NULL,
        "comment"      TEXT,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_coop_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "uq_coop_reviews_order_reviewer" UNIQUE ("order_id","reviewer_id"),
        CONSTRAINT "fk_coop_reviews_order"
          FOREIGN KEY ("order_id") REFERENCES "coop_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_coop_reviews_reviewer"
          FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_coop_reviews_reviewee"
          FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_coop_reviews_reviewee" ON "coop_reviews" ("reviewee_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_coop_reviews_order" ON "coop_reviews" ("order_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "coop_reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coop_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coop_listings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_reactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "community_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "community_posts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "group_memberships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "community_groups"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "coop_orders_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "coop_listings_delivery_option_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "coop_listings_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "coop_listings_category_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "post_reactions_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "community_posts_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "community_posts_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "group_memberships_role_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "community_groups_category_enum"`,
    );
  }
}
