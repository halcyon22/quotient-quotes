# Importing Quotes

By default, both import scripts write to the `commands` and `quotes` tables. Table names can be changed by editing variables near the top of the file.

Both scripts create the slash-command mapping from the given category value, lower-cased. For example, a category value of `FavoriteMovie` will map the command `/favoritemovie` for the quotes from the input file.

## Single-line Quotes

```
oneperline.js <aws region> <filename> <category>
```
The file should contain one quote per line. Blank lines are ignored.

## Multi-line Quotes

```
multiline.js <aws region> <filename> <category>
```

Each quote in a multi-line file must be preceded by a line containing `QUOTESTART`. For example:

```
QUOTESTART
Quote 1 line 1
Quote 1 line 2
QUOTESTART
Quote 2 line 1
Quote 2 line 2
```
