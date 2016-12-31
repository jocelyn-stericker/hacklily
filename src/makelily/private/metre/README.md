# metre-grammar

This is a tool to validate music metres and correct non-standard rest placement,
rhythms and beaming.

## CLI

One way to use this tool is by using the cli:

```bash
node ./index.js
```

The CLI will ignore all lines that do not start with `rests` or `>`.

The `rests` command verifies that a string of rests is standard. If it is, it prints `GOOD`.
If it can provide a correction it will return a string `apply n rule` where `n` is the number
of characters per measure, and `rule` is a command that can be run to correct the issue.
Multiple corrections may be needed. In that case, apply the correction, and call `rests` again.

## Spec

These rules are from _Behind Bars_ by _Elaine Gould_. You should buy that book.

### Grouping rests according to the metre

Rests must be grouped to clarify the divisions of the bar.

Rests with the division of one or more beats may start only on a beat.

```text
rests 4/4 8 .r__r___
> apply 8 ..r_....
rests 4/4 8 .rr_r___
> GOOD

rests 4/4 8 r_.r_.r_
> apply 8 ....r...
rests 4/4 8 r_.rr.r_
> GOOD

rests 3/4 6 .r__..
> apply 6 ..r_..
rests 3/4 6 .rr_..
> GOOD
```

Rests in metres of two and four beats divide to expose the middle of the bar.

Simple time:

```text
rests 4/8 4 r__.
> apply 4 ..r.
rests 4/8 4 r_r.
> GOOD

rests 4/8 4 .r_.
> apply 4 ..r.
rests 4/8 4 .rr.
> GOOD

rests 4/8 4 .r__
> apply 4 ..r_
rests 4/8 4 .rr_
> GOOD

rests 2/4 4 r__.
> apply 4 ..r.
rests 2/4 4 r_r.
> GOOD

rests 2/4 4 .r_.
> apply 4 ..r.
rests 2/4 4 .rr.
> GOOD

rests 2/4 4 .r__
> apply 4 ..r_
rests 2/4 4 .rr_
> GOOD

rests 4/4 4 r__.
> apply 4 ..r.
rests 4/4 4 r_r.
> GOOD

rests 4/4 4 .r_.
> apply 4 ..r.
rests 4/4 4 .rr.
> GOOD

rests 4/4 4 .r__
> apply 4 ..r_
rests 4/4 4 .rr_
> GOOD

rests 2/2 4 r__.
> apply 4 ..r.
rests 2/2 4 r_r.
> GOOD

rests 4/4 4 .r_.
> apply 4 ..r.
rests 4/4 4 .rr.
> GOOD

rests 2/2 4 .r__
> apply 4 ..r_
rests 2/2 4 .rr_
> GOOD

rests 2/2 8 ..r_____
> apply 8 ....r___
rests 2/2 8 ..r_r___
> GOOD

```

Compound time:

```test
rests 6/16 6 r__rr.
> apply 6 ...r_.
rests 6/16 6 r__r_.
> GOOD
rests 6/16 6 ..rr..
> GOOD
rests 6/16 6 .rrr__
> GOOD
rests 6/8 6 r__r_.
> GOOD
rests 6/4 6 r__r_.
> GOOD
rests 12/8 12 r_____r__r_.
> GOOD
rests 6/16 6 .r_rr.
> apply 6 ...r_.
rests 6/16 6 .r_r_.
> apply 6 ..r...
rests 6/16 6 .rrr_.
> GOOD
```

In metres of three beats, rests must show all beats
(a two-beat rest belongs to a metre of two or four beats).

```text
rests 3/4 3 r_.
> apply 3 .r.
rests 3/4 3 rr.
> GOOD
rests 3/4 3 .r_
> apply 3 ..r
rests 3/4 3 .rr
> GOOD
rests 3/8 3 r_.
> apply 3 .r.
rests 3/8 3 rr.
> GOOD
rests 3/8 3 .r_
> apply 3 ..r
rests 3/8 3 .rr
> GOOD
rests 9/8 9 r_____...
> apply 9 ...r__...
rests 9/8 9 r__r__...
> GOOD
```

#### Dotted rests

Older editions do not use dotted rests:

```text
rests(noDots) 2/4 8 r__.r_r.
> apply 8 ..r.....
rests(noDots) 2/4 8 r_r.r_r.
> GOOD
rests(noDots) 2/4 8 r_r.r__.
> apply 8 ......r.
rests(noDots) 2/4 8 r_r.r_r.
> GOOD
rests(noDots) 9/8 9 r_rr_rr_.
> GOOD
rests(noDots) 9/8 9 .rrr_rr_r
> GOOD
rests(noDots) 2/4 16 r______.........
> apply 16 ....r__.........
rests(noDots) 2/4 16 r_____..........
> apply 16 ....r_..........
```

However, beats are more compact and thus easier to read when rests
within a beat are combined:

```text
rests 2/4 8 r__.r__.
> GOOD
rests 9/8 9 r_rr_rr_.
> apply 9 r__......
rests 9/8 9 r__r_rr_.
> apply 9 ...r__...
rests 9/8 9 r__r__r_.
> GOOD
rests 9/8 9 .rrr_rr_r
> apply 9 ...r__...
rests 9/8 9 .rrr__r_r
> apply 9 ......r__
rests 9/8 9 .rrr__r__
> GOOD
rests 2/4 16 r______.........
> GOOD
```

##### Simple time

_Rests at the beginning and end of beats_: the recommended practice is to use
dotted rests at the begining but not at the end of a beat. This visually
identifies on which part of the beat the rests fall:

```text
rests 2/4 8 r__..rr_
> GOOD
rests 2/2 8 r__..rr_
> GOOD
rests 2/4 8 r__..r_r
> apply 8 ......r.
rests 2/4 8 r__..rrr
> apply 8 ......r_
rests 2/4 8 r__..rr_
> GOOD
rests 2/4 8 rrr.....
> apply 8 r__.....
rests 2/4 8 r__.....
> GOOD
```

It is acceptable to use dotted rests at both the beginning and the end of a beat,
although the visual sifference between the types of rest is lost:

```text
rests 2/4 8 r__..r__
> GOOD
rests 2/2 8 r__..r__
> GOOD
```

The longest permitted dotted rest is one value smaller than the beat. In
crotchet metres, the longest dotted rest is a dotted quaver:

```text
rests 4/4 8 r______.
> apply 8 ....r__.
rests 4/4 8 r___r__.
> apply 8 ......r.
rests 4/4 8 r___r_r.
> GOOD
rests 4/4 16 r__.r___r_______
> GOOD
```

In minim metres, the longest dotted rest is a dotted crotchet:

```text
rests 2/2 8 r_____r.
> apply 8 ....r_..
rests 2/2 8 r__.r__.
> GOOD
rests 2/2 8 .rr_r___
> GOOD
```

The dotted-minim rest is normally never used in simple time. The only
exception is to show units of three crotchets in time signatures such as 5/4 and
also 7/4. TODO

_Double-dotted rests:_ these may replace two or more rests within a beat:

```text
rests 2/4 16 r______..r______
> GOOD
```

When it is useful to differentiate rests before and after a beat, use the double
dotting only at the beginning of a beat:

```text
rests 2/4 16 r______..rr_r___
> GOOD
```

When it is preferable to show more clearly how the beat is divided, divide
the rest into half-beats:

```text
rests 2/4 16 r___r__..rr_r___
> GOOD
rests 4/4 8 rr_.....
> apply 8 ..r.....
rests 4/4 8 rrr.....
> apply 8 r_......
rests 4/4 8 r_r.....
> GOOD
```

_Rests in the middle of a beat_: these should expose the middle of a beat:

```text
rests 2/4 16 .r_____.r_______
> apply 16 ....r__.........
rests 2/4 16 .r__r__.r_______
> GOOD
rests 2/4 16 .rr_r__.r_______
> GOOD
```

but may be combined when rhythms are straightforward (TODO):

```text
rests 2/4 8 .r_..r_.
> apply 8 ..r.....
rests 2/4 8 .rr..r_.
> apply 8 ......r.
rests 2/4 8 .rr..rr.
> GOOD
```

##### Compound time

The dotted rest as a whole beat differentiates compound- from simple-time
metres.

Whole beats may be combined as long as the rests do not obscure the important
divisions of the bar. Otherwise, no rest should be written across a beat:

```text
rests 12/8 24 r_________________......
> apply 24 ............r_____......
rests 12/8 24 r___________r_____......
> GOOD
rests 12/8 24 ......r_____r___________
> GOOD
```

_Rests within a beat:_ rests at the beginning of a beat may be combined:

```text
rests 6/8 6 rr.r_.
> apply 6 r_....
rests 6/8 6 r_.r_.
> GOOD
```

When there are alternative ways of combining rests, it is better to indicate
the second rather than the third division of the beat, since this clarifies the
divisions more quickly

```text
rests 6/8 12 r___r.r_____
> GOOD
^^ XXX: wrong
rests 6/8 12 r_r__.r_____
> apply 12 ....r.......
^^ XXX: wrong
rests 6/8 12 r_r_r.r_____
> apply 12 r___........
^^ XXX: wrong
rests 6/8 12 r___r.r_____
> GOOD
^^ XXX: wrong
```

Rests that follow a beat should expose all three divisions:

```text
rests 6/8 12 ..r_r_..r_r_
> GOOD
```

If it is important for a performer to sense all three divisions of and
accompanying part, rests at the beginning of the beat should show these:

(TODO)

Otherwise it is better to combine the rests, as this clarifies the position of beats,
especially in long bars.

```text
rests 9/8 9 .rrrr.rr.
> apply 9 ...r_....
```

In the middle of a beat, rests must expose at least two of the three divisions.
Indicate all three divisions if this is important to the musical sense.

(TODO)

#### Impossible rest durations

```text
rests 4/4 16 r____...........
> apply 16 ....r...........
rests 4/4 32 r____...........................
> apply 32 ....r...........................
```