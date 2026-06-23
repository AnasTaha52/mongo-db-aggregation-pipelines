# 🍃 MongoDB Aggregation Pipeline — Practical Guide

> **Prerequisites:** You should already know MongoDB basics — connecting via Atlas, CRUD operations, and how to use the MongoDB shell or Compass. This guide focuses entirely on the **Aggregation Framework**.

---

## 📋 Table of Contents

1. [What is an Aggregation Pipeline?](#-what-is-an-aggregation-pipeline)
2. [Sample Collection Structure](#-sample-collection-structure)
3. [Scenarios & Pipelines](#-scenarios--pipelines)
   - [1. Count Active Users](#1-how-many-users-are-active)
   - [2. List Unique Eye Colors](#2-list-all-unique-eye-colors)
   - [3. Average Tags Per User](#3-what-is-the-average-number-of-tags-per-user)
   - [4. Most Recently Registered User](#4-who-registered-most-recently)
   - [5. Users With Both 'enim' and 'id' Tags](#5-find-users-who-have-both-enim-and-id-as-their-tags)
   - [6. Users With 'enim' Tag](#6-how-many-users-have-enim-as-one-of-their-tags)
   - [7. Inactive Users With 'velit' Tag](#7-names-and-ages-of-inactive-users-with-velit-as-a-tag)
   - [8. Phone Starting With +1 (940)](#8-users-with-phone-number-starting-with-1-940)
   - [9. Categorize by Favorite Fruit](#9-categorize-users-by-their-favorite-fruit)
   - [10. 'ad' as Second Tag](#10-users-who-have-ad-as-the-second-tag)
   - [11. Companies in USA With User Count](#11-companies-in-usa-with-their-user-count)
   - [12. Average Age of All Users](#12-average-age-of-all-users)
   - [13. Top 5 Favorite Fruits](#13-top-5-most-common-favorite-fruits)
   - [14. Country With Most Users](#14-country-with-the-highest-number-of-registered-users)
   - [15. Male vs Female Count](#15-total-number-of-males-and-females)
   - [16. \$lookup — Joining Collections](#16-lookup-operator---joining-collections)
4. [Pipeline Stages — Quick Reference](#-pipeline-stages--quick-reference)
5. [Operators — Quick Reference](#-operators--quick-reference)
6. [Tips & Best Practices](#-tips--best-practices)

---

## 🔍 What is an Aggregation Pipeline?

An **aggregation pipeline** is a sequence of stages that process documents from a collection. Each stage transforms the documents and passes the result to the next stage — like an assembly line.

```
Collection → [$stage1] → [$stage2] → [$stage3] → Result
```

**Basic Syntax:**
```javascript
db.collectionName.aggregate([
  { $stage1: { /* options */ } },
  { $stage2: { /* options */ } },
  // ...more stages
])
```

---

## 🗂 Sample Collection Structure

All scenarios below are based on a **`users`** collection. Each document looks like this:

```json
{
  "_id": { "$oid": "6406ad63fc13ae5a400000ca" },
  "index": 0,
  "name": "Aurelia Gonzales",
  "isActive": false,
  "registered": { "$date": "2015-02-11T04:22:39.000Z" },
  "age": 20,
  "gender": "female",
  "eyeColor": "green",
  "favoriteFruit": "banana",
  "company": {
    "title": "YURTURE",
    "email": "aureliagonzales@yurture.com",
    "phone": "+1 (940) 501-3963",
    "location": {
      "country": "USA",
      "address": "694 Hewes Street"
    }
  },
  "tags": ["enim", "id", "velit", "ad", "laboris", "cillum"]
}
```

> 💡 For the `$lookup` scenario, a second collection called **`authors`** is used — its structure is shown in [Scenario 16](#16-lookup-operator---joining-collections).

---

## 🚀 Scenarios & Pipelines

---

### 1. How Many Users Are Active?

**Goal:** Count how many users have `isActive: true`.

```javascript
db.users.aggregate([
  {
    $match: { isActive: true }
  },
  {
    $count: "activeUsers"
  }
])
```

**Output:**
```json
[{ "activeUsers": 516 }]
```

**Alternative — See both active & inactive in one shot:**
```javascript
db.users.aggregate([
  {
    $group: {
      _id: "$isActive",
      count: { $sum: 1 }
    }
  }
])
```

**Output:**
```json
[
  { "_id": true,  "count": 516 },
  { "_id": false, "count": 484 }
]
```

**Stages Used:** `$match`, `$count`, `$group`
**Operators Used:** `$sum`

---

### 2. List All Unique Eye Colors

**Goal:** Get a list of every distinct eye color that exists in the collection (no duplicates).

```javascript
db.users.aggregate([
  {
    $group: {
      _id: null,
      uniqueEyeColors: { $addToSet: "$eyeColor" }
    }
  }
])
```

**Output:**
```json
[{
  "_id": null,
  "uniqueEyeColors": ["green", "blue", "brown"]
}]
```

> `_id: null` means we are grouping **all documents together** into one single group. We're not splitting by any field — we just want a single aggregated result.

**Stages Used:** `$group`
**Operators Used:** `$addToSet` — collects values into an array, automatically removing duplicates.

---

### 3. What is the Average Number of Tags Per User?

**Goal:** Find the average count of tags across all users.

#### Method 1 — Using `$unwind` (step-by-step approach)
```javascript
db.users.aggregate([
  {
    $unwind: "$tags"         // Deconstructs each tag into a separate document
  },
  {
    $group: {
      _id: "$_id",           // Group back by each user
      tagCount: { $sum: 1 }  // Count how many tags they have
    }
  },
  {
    $group: {
      _id: null,
      averageTags: { $avg: "$tagCount" }  // Average across all users
    }
  }
])
```

#### Method 2 — Using `$size` (cleaner, single-pass approach)
```javascript
db.users.aggregate([
  {
    $addFields: {
      tagsCount: { $size: "$tags" }  // Add a new field with the count of tags
    }
  },
  {
    $group: {
      _id: null,
      averageTags: { $avg: "$tagsCount" }
    }
  }
])
```

**Output:**
```json
[{ "_id": null, "averageTags": 3.556 }]
```

> 💡 Method 2 is preferred — it avoids the expensive `$unwind` + `$group` double-pass.

**Stages Used:** `$unwind`, `$group`, `$addFields`
**Operators Used:** `$sum`, `$avg`, `$size`

---

### 4. Who Registered Most Recently?

**Goal:** Find the single user who registered latest.

```javascript
db.users.aggregate([
  {
    $sort: { registered: -1 }   // Sort by date, newest first
  },
  {
    $limit: 1                   // Take only the first document
  },
  {
    $project: {                 // Return only relevant fields
      _id: 0,
      name: 1,
      registered: 1
    }
  }
])
```

**Output:**
```json
[{ "name": "Stephenson Griffith", "registered": "2024-12-31T..." }]
```

**Stages Used:** `$sort`, `$limit`, `$project`

---

### 5. Find Users Who Have Both 'enim' and 'id' as Their Tags

**Goal:** Filter users where the `tags` array contains **both** specified values.

```javascript
db.users.aggregate([
  {
    $match: {
      tags: { $all: ["enim", "id"] }   // Must contain ALL of these values
    }
  },
  {
    $project: {
      _id: 0,
      name: 1,
      tags: 1
    }
  }
])
```

**Output:**
```json
[
  { "name": "Aurelia Gonzales", "tags": ["enim", "id", "velit", "ad", "laboris"] },
  { "name": "Hays Wise",        "tags": ["id", "enim", "cillum"] }
]
```

> `$all` checks that **every** element in the given array is present in the document's array — order does not matter.

**Stages Used:** `$match`, `$project`
**Operators Used:** `$all`

---

### 6. How Many Users Have 'enim' as One of Their Tags?

**Goal:** Count users where `"enim"` appears anywhere in their `tags` array.

```javascript
db.users.aggregate([
  {
    $match: { tags: "enim" }   // MongoDB checks if "enim" is an element of the array
  },
  {
    $count: "usersWithEnim"
  }
])
```

**Output:**
```json
[{ "usersWithEnim": 152 }]
```

> When you match an array field against a scalar (single value), MongoDB automatically checks if that value **exists anywhere in the array**.

**Stages Used:** `$match`, `$count`

---

### 7. Names and Ages of Inactive Users With 'velit' as a Tag

**Goal:** Apply two conditions simultaneously and return only specific fields.

```javascript
db.users.aggregate([
  {
    $match: {
      isActive: false,
      tags: "velit"
    }
  },
  {
    $project: {
      _id: 0,
      name: 1,
      age: 1
    }
  }
])
```

**Output:**
```json
[
  { "name": "Kitty Snow",     "age": 38 },
  { "name": "Lila Mckinney", "age": 25 }
]
```

**Stages Used:** `$match`, `$project`

> 💡 Multiple conditions inside a single `$match` are treated as **AND** by default.

---

### 8. Users With Phone Number Starting With +1 (940)

**Goal:** Use a **regex pattern** to filter by phone prefix.

```javascript
db.users.aggregate([
  {
    $match: {
      "company.phone": /^\+1 \(940\)/   // Regex: starts with "+1 (940)"
    }
  },
  {
    $count: "usersWithPhone"
  }
])
```

**Output:**
```json
[{ "usersWithPhone": 5 }]
```

> 🔑 **Dot notation** (`"company.phone"`) is used to query nested fields inside an embedded document.
> The `^` anchor in the regex means the string **must start** with the given pattern.

**Stages Used:** `$match`, `$count`

---

### 9. Categorize Users by Their Favorite Fruit

**Goal:** Group users into buckets based on `favoriteFruit` and list all users in each bucket.

```javascript
db.users.aggregate([
  {
    $group: {
      _id: "$favoriteFruit",
      count: { $sum: 1 },
      users: { $push: "$name" }   // Collect all names into an array
    }
  },
  {
    $sort: { count: -1 }
  }
])
```

**Output:**
```json
[
  { "_id": "banana",     "count": 339, "users": ["Aurelia Gonzales", ...] },
  { "_id": "apple",      "count": 338, "users": ["Hays Wise", ...] },
  { "_id": "strawberry", "count": 323, "users": ["Kitty Snow", ...] }
]
```

**Stages Used:** `$group`, `$sort`
**Operators Used:** `$sum`, `$push`

---

### 10. Users Who Have 'ad' as the Second Tag

**Goal:** Target a **specific index** in an array using dot notation with an index number.

```javascript
db.users.aggregate([
  {
    $match: { "tags.1": "ad" }   // Index 1 = second element (zero-based)
  },
  {
    $count: "usersWithAdAsSecondTag"
  }
])
```

**Output:**
```json
[{ "usersWithAdAsSecondTag": 12 }]
```

> `"tags.1"` means the element at **index 1** (second position) in the `tags` array. Arrays are zero-indexed.

**Stages Used:** `$match`, `$count`

---

### 11. Companies in USA With Their User Count

**Goal:** Filter by a nested field (`company.location.country`) and group by company name.

```javascript
db.users.aggregate([
  {
    $match: { "company.location.country": "USA" }
  },
  {
    $group: {
      _id: "$company.title",
      userCount: { $sum: 1 }
    }
  },
  {
    $sort: { userCount: -1 }
  }
])
```

**Output:**
```json
[
  { "_id": "YURTURE",  "userCount": 3 },
  { "_id": "ACME",     "userCount": 2 },
  { "_id": "CENTURIA", "userCount": 1 }
]
```

**Stages Used:** `$match`, `$group`, `$sort`
**Operators Used:** `$sum`

---

### 12. Average Age of All Users

**Goal:** Compute a single average across the entire collection.

```javascript
db.users.aggregate([
  {
    $group: {
      _id: null,
      averageAge: { $avg: "$age" }
    }
  }
])
```

**Output:**
```json
[{ "_id": null, "averageAge": 29.835 }]
```

**Stages Used:** `$group`
**Operators Used:** `$avg`

---

### 13. Top 5 Most Common Favorite Fruits

**Goal:** Rank fruits by popularity and take the top 5.

```javascript
db.users.aggregate([
  {
    $group: {
      _id: "$favoriteFruit",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }   // Descending = most popular first
  },
  {
    $limit: 5
  }
])
```

**Output:**
```json
[
  { "_id": "banana",     "count": 339 },
  { "_id": "apple",      "count": 338 },
  { "_id": "strawberry", "count": 323 }
]
```

> `$sort` → `$limit` is the classic pattern for **top-N** queries.

**Stages Used:** `$group`, `$sort`, `$limit`
**Operators Used:** `$sum`

---

### 14. Country With the Highest Number of Registered Users

**Goal:** Find which country appears most frequently in the collection.

```javascript
db.users.aggregate([
  {
    $group: {
      _id: "$company.location.country",
      userCount: { $sum: 1 }
    }
  },
  {
    $sort: { userCount: -1 }
  },
  {
    $limit: 1
  }
])
```

**Output:**
```json
[{ "_id": "Germany", "userCount": 261 }]
```

**Stages Used:** `$group`, `$sort`, `$limit`
**Operators Used:** `$sum`

---

### 15. Total Number of Males and Females

**Goal:** Split the entire user base by gender and get a count for each.

```javascript
db.users.aggregate([
  {
    $group: {
      _id: "$gender",
      count: { $sum: 1 }
    }
  }
])
```

**Output:**
```json
[
  { "_id": "male",   "count": 507 },
  { "_id": "female", "count": 493 }
]
```

**Stages Used:** `$group`
**Operators Used:** `$sum`

---

### 16. `$lookup` Operator — Joining Collections

**Goal:** Combine data from two separate collections — like a SQL `JOIN`.

#### Collection Structures

**`authors` collection:**
```json
{
  "_id": { "$oid": "..." },
  "name": "John Green",
  "birth_year": 1977
}
```

**`books` collection:**
```json
{
  "_id": { "$oid": "..." },
  "title": "The Fault in Our Stars",
  "author_id": { "$oid": "..." },   // References authors._id
  "genre": "Romance"
}
```

#### Pipeline — Enrich Each Book With Author Details

```javascript
db.books.aggregate([
  {
    $lookup: {
      from: "authors",        // The collection to join with
      localField: "author_id", // Field in the current (books) collection
      foreignField: "_id",     // Field in the "authors" collection to match against
      as: "author_details"     // Name of the new array field added to each document
    }
  },
  {
    $addFields: {
      // $lookup always returns an array — use $first to extract the single object
      author_details: { $first: "$author_details" }
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      genre: 1,
      "author_details.name": 1,
      "author_details.birth_year": 1
    }
  }
])
```

**Output:**
```json
[
  {
    "title": "The Fault in Our Stars",
    "genre": "Romance",
    "author_details": {
      "name": "John Green",
      "birth_year": 1977
    }
  }
]
```

> ⚠️ **Key Rule:** `$lookup` **always** returns the joined result as an **array**, even if there is only one matching document. Use `{ $first: "$fieldName" }` inside `$addFields` to flatten it into a plain object.

**Stages Used:** `$lookup`, `$addFields`, `$project`
**Operators Used:** `$first`

---

## 📘 Pipeline Stages — Quick Reference

| Stage | Purpose |
|---|---|
| `$match` | Filters documents (like a `WHERE` clause). Place early to reduce data volume. |
| `$group` | Groups documents by a key and applies accumulators. |
| `$project` | Shapes output — include/exclude fields, rename them, or compute new ones. |
| `$sort` | Sorts documents. `-1` = descending, `1` = ascending. |
| `$limit` | Keeps only the first N documents. |
| `$skip` | Skips the first N documents (useful for pagination). |
| `$count` | Returns the total count of documents reaching that stage. |
| `$unwind` | Deconstructs an array field — one document per array element. |
| `$addFields` / `$set` | Adds new fields or overwrites existing ones without touching others. |
| `$lookup` | Left outer join with another collection. |
| `$replaceRoot` | Promotes a nested document to become the new root. |
| `$facet` | Runs multiple sub-pipelines in parallel on the same input. |
| `$bucket` | Categorizes documents into manually-defined ranges. |
| `$bucketAuto` | Like `$bucket` but MongoDB chooses the range boundaries automatically. |
| `$out` | Writes pipeline results into a new (or existing) collection. |
| `$sample` | Returns N randomly selected documents. |

---

## ⚙️ Operators — Quick Reference

### Accumulator Operators (inside `$group`)

| Operator | Description |
|---|---|
| `$sum` | Totals numeric values; `$sum: 1` counts documents. |
| `$avg` | Calculates the arithmetic mean. |
| `$min` | Returns the smallest value in the group. |
| `$max` | Returns the largest value in the group. |
| `$push` | Collects values into an array (duplicates allowed). |
| `$addToSet` | Collects values into an array (duplicates removed). |
| `$first` | Returns the first value in the group (after sorting). |
| `$last` | Returns the last value in the group (after sorting). |

### Array Operators

| Operator | Description |
|---|---|
| `$size` | Returns the number of elements in an array. |
| `$first` | Returns the first element of an array. |
| `$last` | Returns the last element of an array. |
| `$arrayElemAt` | Returns element at a given index: `{ $arrayElemAt: ["$tags", 0] }` |
| `$slice` | Returns a subset of an array: `{ $slice: ["$tags", 2] }` |
| `$filter` | Returns only elements matching a condition. |
| `$map` | Applies an expression to every element of an array. |
| `$in` | Checks if a value exists in an array. |
| `$concatArrays` | Merges two or more arrays into one. |

### String Operators

| Operator | Description |
|---|---|
| `$concat` | Concatenates strings: `{ $concat: ["$firstName", " ", "$lastName"] }` |
| `$toUpper` | Converts string to uppercase. |
| `$toLower` | Converts string to lowercase. |
| `$substr` | Extracts a substring by position and length. |
| `$trim` | Removes whitespace from both ends. |
| `$split` | Splits a string into an array by a delimiter. |
| `$strLenCP` | Returns string length (in code points). |
| `$regexMatch` | Returns true if string matches a regex pattern. |

### Arithmetic Operators

| Operator | Description |
|---|---|
| `$add` | Adds numbers (or adds milliseconds to a date). |
| `$subtract` | Subtracts two numbers (or two dates). |
| `$multiply` | Multiplies numbers. |
| `$divide` | Divides numbers. |
| `$mod` | Returns the remainder after division. |
| `$abs` | Absolute value. |
| `$ceil` | Rounds up to nearest integer. |
| `$floor` | Rounds down to nearest integer. |
| `$round` | Rounds to N decimal places. |
| `$sqrt` | Square root. |
| `$pow` | Raises to a power. |

### Conditional Operators

| Operator | Description |
|---|---|
| `$cond` | Ternary: `{ $cond: { if: <expr>, then: <val>, else: <val> } }` |
| `$ifNull` | Returns a fallback if the field is null/missing. |
| `$switch` | Multi-branch conditional (like `switch-case`). |

### Date Operators

| Operator | Description |
|---|---|
| `$year` | Extracts the year from a date. |
| `$month` | Extracts the month (1–12). |
| `$dayOfMonth` | Extracts the day (1–31). |
| `$hour` | Extracts the hour (0–23). |
| `$dayOfWeek` | Returns day of week (1=Sunday, 7=Saturday). |
| `$dateToString` | Formats a date: `{ $dateToString: { format: "%Y-%m-%d", date: "$registered" } }` |

### Comparison Operators (inside expressions)

| Operator | Description |
|---|---|
| `$eq` | Equal to |
| `$ne` | Not equal to |
| `$gt` | Greater than |
| `$gte` | Greater than or equal to |
| `$lt` | Less than |
| `$lte` | Less than or equal to |
| `$cmp` | Compares two values; returns -1, 0, or 1 |

---

## 💡 Tips & Best Practices

### 1. Put `$match` as Early as Possible
```javascript
// ✅ Good — filters first, then groups (less data to process)
[{ $match: { isActive: true } }, { $group: {...} }]

// ❌ Bad — groups everything, then filters (wasteful)
[{ $group: {...} }, { $match: { isActive: true } }]
```

### 2. Use `$project` to Drop Fields You Don't Need
Removing large or unnecessary fields early reduces memory usage in later stages.
```javascript
{ $project: { password: 0, __v: 0 } }
```

### 3. `$addToSet` vs `$push`
```javascript
// $push — keeps duplicates
tags: { $push: "$eyeColor" }   // ["blue", "green", "blue"]

// $addToSet — removes duplicates
tags: { $addToSet: "$eyeColor" } // ["blue", "green"]
```

### 4. `$limit` Before `$lookup` Whenever Possible
`$lookup` is expensive — apply `$match`, `$sort`, and `$limit` before it to minimize joined documents.

### 5. `_id: null` in `$group` = Global Aggregation
When you don't want to group by any field — just compute something over the whole collection:
```javascript
{ $group: { _id: null, totalUsers: { $sum: 1 } } }
```

### 6. `$lookup` Always Returns an Array
Even if there's only one matching document, the result is an array. Use `$first` to unwrap it:
```javascript
{ $addFields: { authorInfo: { $first: "$authorInfo" } } }
```

### 7. Access Nested Fields With Dot Notation (in Quotes)
```javascript
// ✅ Correct
{ $match: { "company.location.country": "USA" } }

// ❌ Wrong
{ $match: { company.location.country: "USA" } }
```

### 8. Array Index Access With Dot Notation
```javascript
{ $match: { "tags.0": "enim" } }   // First element
{ $match: { "tags.1": "ad"   } }   // Second element
```

---

## 📁 Project Structure

```
mongodb-aggregation-practice/
│
├── data/
│   └── users.json          # Sample dataset (import with mongoimport)
│
├── queries/
│   ├── 01_active_users.js
│   ├── 02_unique_eye_colors.js
│   ├── 03_average_tags.js
│   ├── 04_recent_registration.js
│   ├── 05_multiple_tags.js
│   ├── 06_single_tag_count.js
│   ├── 07_inactive_velit.js
│   ├── 08_phone_filter.js
│   ├── 09_categorize_fruit.js
│   ├── 10_second_tag.js
│   ├── 11_usa_companies.js
│   ├── 12_average_age.js
│   ├── 13_top_fruits.js
│   ├── 14_top_country.js
│   ├── 15_gender_count.js
│   └── 16_lookup.js
│
└── README.md
```

---

## 🗃 Import Sample Data

```bash
mongoimport --uri "<your-atlas-connection-string>" \
  --db practiceDB \
  --collection users \
  --file data/users.json \
  --jsonArray
```

---

*Built while practising MongoDB Aggregation Pipelines — covering `$match`, `$group`, `$project`, `$sort`, `$limit`, `$count`, `$unwind`, `$lookup`, `$addFields`, `$push`, `$addToSet`, `$avg`, `$sum`, `$size`, `$first`, `$all`, and regex filtering.*
