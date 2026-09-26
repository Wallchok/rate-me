-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "productId" INTEGER,
    "addedById" INTEGER NOT NULL,
    "boughtById" INTEGER,
    "boughtAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShoppingItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ShoppingItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShoppingItem_boughtById_fkey" FOREIGN KEY ("boughtById") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
