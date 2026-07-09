import checkRests from "../private_metre_checkRests";

const opts = { dotsAllowed: true };

function _expectRestChk(ts: string, song: string) {
  return expect(checkRests(ts, song.length, song, opts));
}

describe("checkRests (Grouping rests according to the metre)", function () {
  // These rules are from _Behind Bars_ by _Elaine Gould_. You should buy that book.

  it(
    "groups rests to clarify the divisions of the bar, ensuring that " +
      "rests with the division of one or more beats may start only on a beat.",
    function () {
      _expectRestChk("4/4", ".r__r___").toEqual("apply 8 ..r_....");
      _expectRestChk("4/4", ".rr_r___").toEqual("GOOD");

      _expectRestChk("4/4", "r_.r_.r_").toEqual("apply 8 ....r...");
      _expectRestChk("4/4", "r_.rr.r_").toEqual("GOOD");

      _expectRestChk("3/4", ".r__..").toEqual("apply 6 ..r_..");
      _expectRestChk("3/4", ".rr_..").toEqual("GOOD");
    },
  );

  describe("divides rests to expose the middle of the bar", function () {
    it("in simple time", function () {
      _expectRestChk("4/8", "r__.").toEqual("apply 4 ..r.");
      _expectRestChk("4/8", "r_r.").toEqual("GOOD");

      _expectRestChk("4/8", ".r_.").toEqual("apply 4 ..r.");
      _expectRestChk("4/8", ".rr.").toEqual("GOOD");

      _expectRestChk("4/8", ".r__").toEqual("apply 4 ..r_");
      _expectRestChk("4/8", ".rr_").toEqual("GOOD");

      _expectRestChk("2/4", "r__.").toEqual("apply 4 ..r.");
      _expectRestChk("2/4", "r_r.").toEqual("GOOD");

      _expectRestChk("2/4", ".r_.").toEqual("apply 4 ..r.");
      _expectRestChk("2/4", ".rr.").toEqual("GOOD");

      _expectRestChk("2/4", ".r__").toEqual("apply 4 ..r_");
      _expectRestChk("2/4", ".rr_").toEqual("GOOD");

      _expectRestChk("4/4", "r__.").toEqual("apply 4 ..r.");
      _expectRestChk("4/4", "r_r.").toEqual("GOOD");

      _expectRestChk("4/4", ".r_.").toEqual("apply 4 ..r.");
      _expectRestChk("4/4", ".rr.").toEqual("GOOD");

      _expectRestChk("4/4", ".r__").toEqual("apply 4 ..r_");
      _expectRestChk("4/4", ".rr_").toEqual("GOOD");

      _expectRestChk("2/2", "r__.").toEqual("apply 4 ..r.");
      _expectRestChk("2/2", "r_r.").toEqual("GOOD");

      _expectRestChk("4/4", ".r_.").toEqual("apply 4 ..r.");
      _expectRestChk("4/4", ".rr.").toEqual("GOOD");

      _expectRestChk("2/2", ".r__").toEqual("apply 4 ..r_");
      _expectRestChk("2/2", ".rr_").toEqual("GOOD");

      _expectRestChk("2/2", "..r_____").toEqual("apply 8 ....r___");
      _expectRestChk("2/2", "..r_r___").toEqual("GOOD");
    });

    it("in compound time", function () {
      _expectRestChk("6/16", "r__rr.").toEqual("apply 6 ...r_.");
      _expectRestChk("6/16", "r__r_.").toEqual("GOOD");
      _expectRestChk("6/16", "..rr..").toEqual("GOOD");
      _expectRestChk("6/16", ".rrr__").toEqual("GOOD");
      _expectRestChk("6/8", "r__r_.").toEqual("GOOD");
      _expectRestChk("6/4", "r__r_.").toEqual("GOOD");
      _expectRestChk("12/8", "r_____r__r_.").toEqual("GOOD");
      _expectRestChk("6/16", ".r_rr.").toEqual("apply 6 ...r_.");
      _expectRestChk("6/16", ".r_r_.").toEqual("apply 6 ..r...");
      _expectRestChk("6/16", ".rrr_.").toEqual("GOOD");
    });
  });

  it(
    "shows all beats in metres of three beats " +
      "(a two-beat rest belongs to a metre of two or four beats)",
    function () {
      _expectRestChk("3/4", "r_.").toEqual("apply 3 .r.");
      _expectRestChk("3/4", "rr.").toEqual("GOOD");
      _expectRestChk("3/4", ".r_").toEqual("apply 3 ..r");
      _expectRestChk("3/4", ".rr").toEqual("GOOD");
      _expectRestChk("3/8", "r_.").toEqual("apply 3 .r.");
      _expectRestChk("3/8", "rr.").toEqual("GOOD");
      _expectRestChk("3/8", ".r_").toEqual("apply 3 ..r");
      _expectRestChk("3/8", ".rr").toEqual("GOOD");
      _expectRestChk("9/8", "r_____...").toEqual("apply 9 ...r__...");
      _expectRestChk("9/8", "r__r__...").toEqual("GOOD");
    },
  );

  describe("Handling of dotted rests", function () {
    it("allows for older editions, which do not use dotted rests", function () {
      expect(checkRests("2/4", 8, "r__.r_r.", { dotsAllowed: false })).toEqual(
        "apply 8 ..r.....",
      );
      expect(checkRests("2/4", 8, "r_r.r_r.", { dotsAllowed: false })).toEqual(
        "GOOD",
      );
      expect(checkRests("2/4", 8, "r_r.r__.", { dotsAllowed: false })).toEqual(
        "apply 8 ......r.",
      );
      expect(checkRests("2/4", 8, "r_r.r_r.", { dotsAllowed: false })).toEqual(
        "GOOD",
      );
      expect(checkRests("9/8", 9, "r_rr_rr_.", { dotsAllowed: false })).toEqual(
        "GOOD",
      );
      expect(checkRests("9/8", 9, ".rrr_rr_r", { dotsAllowed: false })).toEqual(
        "GOOD",
      );
      expect(
        checkRests("2/4", 16, "r______.........", { dotsAllowed: false }),
      ).toEqual("apply 16 ....r__.........");
      expect(
        checkRests("2/4", 16, "r_____..........", { dotsAllowed: false }),
      ).toEqual("apply 16 ....r_..........");
    });

    describe("allows for rests within a beat to be combined", function () {
      it("(basic)", function () {
        _expectRestChk("2/4", "r__.r__.").toEqual("GOOD");
        _expectRestChk("9/8", "r_rr_rr_.").toEqual("apply 9 r__......");
        _expectRestChk("9/8", "r__r_rr_.").toEqual("apply 9 ...r__...");
        _expectRestChk("9/8", "r__r__r_.").toEqual("GOOD");
        _expectRestChk("9/8", ".rrr_rr_r").toEqual("apply 9 ...r__...");
        _expectRestChk("9/8", ".rrr__r_r").toEqual("apply 9 ......r__");
        _expectRestChk("9/8", ".rrr__r__").toEqual("GOOD");
        _expectRestChk("2/4", "r______.........").toEqual("GOOD");
      });

      describe("in simple time", function () {
        it(
          "Rests at the beginning and end of beats: the recommended practice is to use " +
            "dotted rests at the begining but not at the end of a beat. This visually " +
            "identifies on which part of the beat the rests fall:",
          function () {
            _expectRestChk("2/4", "r__..rr_").toEqual("GOOD");
            _expectRestChk("2/2", "r__..rr_").toEqual("GOOD");
            _expectRestChk("2/4", "r__..r_r").toEqual("apply 8 ......r.");
            _expectRestChk("2/4", "r__..rrr").toEqual("apply 8 ......r_");
            _expectRestChk("2/4", "r__..rr_").toEqual("GOOD");
            _expectRestChk("2/4", "rrr.....").toEqual("apply 8 r__.....");
            _expectRestChk("2/4", "r__.....").toEqual("GOOD");
          },
        );

        it(
          "It is acceptable to use dotted rests at both the beginning and the end of a beat, " +
            "although the visual sifference between the types of rest is lost",
          function () {
            _expectRestChk("2/4", "r__..r__").toEqual("GOOD");
            _expectRestChk("2/2", "r__..r__").toEqual("GOOD");
          },
        );

        it(
          "The longest permitted dotted rest is one value smaller than the beat. In " +
            "crotchet metres, the longest dotted rest is a dotted quaver",
          function () {
            _expectRestChk("4/4", "r______.").toEqual("apply 8 ....r__.");
            _expectRestChk("4/4", "r___r__.").toEqual("apply 8 ......r.");
            _expectRestChk("4/4", "r___r_r.").toEqual("GOOD");
            _expectRestChk("4/4", "r__.r___r_______").toEqual("GOOD");
          },
        );

        it("In minim metres, the longest dotted rest is a dotted crotchet:", function () {
          _expectRestChk("2/2", "r_____r.").toEqual("apply 8 ....r_..");
          _expectRestChk("2/2", "r__.r__.").toEqual("GOOD");
          _expectRestChk("2/2", ".rr_r___").toEqual("GOOD");
        });

        it(
          "The dotted-minim rest is normally never used in simple time. The only " +
            "exception is to show units of three crotchets in time signatures such as 5/4 and " +
            "also 7/4.",
          function () {
            // TODO
          },
        );

        it("Double-dotted rests: these may replace two or more rests within a beat", function () {
          _expectRestChk("2/4", "r______..r______").toEqual("GOOD");
        });

        it(
          "When it is useful to differentiate rests before and after a beat, use the double " +
            "dotting only at the beginning of a beat",
          function () {
            _expectRestChk("2/4", "r______..rr_r___").toEqual("GOOD");
          },
        );

        it(
          "When it is preferable to show more clearly how the beat is divided, divide " +
            "the rest into half-beats:",
          function () {
            _expectRestChk("2/4", "r___r__..rr_r___").toEqual("GOOD");
            _expectRestChk("4/4", "rr_.....").toEqual("apply 8 ..r.....");
            _expectRestChk("4/4", "rrr.....").toEqual("apply 8 r_......");
            _expectRestChk("4/4", "r_r.....").toEqual("GOOD");
          },
        );

        it("Rests in the middle of a beat: these should expose the middle of a beat:", function () {
          _expectRestChk("2/4", ".r_____.r_______").toEqual(
            "apply 16 ....r__.........",
          );
          _expectRestChk("2/4", ".r__r__.r_______").toEqual("GOOD");
          _expectRestChk("2/4", ".rr_r__.r_______").toEqual("GOOD");
        });

        it("but may be combined when rhythms are straightforward (TODO)", function () {
          _expectRestChk("2/4", ".r_..r_.").toEqual("apply 8 ..r.....");
          _expectRestChk("2/4", ".rr..r_.").toEqual("apply 8 ......r.");
          _expectRestChk("2/4", ".rr..rr.").toEqual("GOOD");
        });
      });

      describe("in compound time", function () {
        it(
          "The dotted rest as a whole beat differentiates compound- from simple-time " +
            "metres.\n" +
            "Whole beats may be combined as long as the rests do not obscure the important " +
            "divisions of the bar. Otherwise, no rest should be written across a beat: ",
          function () {
            _expectRestChk("12/8", "r_________________......").toEqual(
              "apply 24 ............r_____......",
            );
            _expectRestChk("12/8", "r___________r_____......").toEqual("GOOD");
            _expectRestChk("12/8", "......r_____r___________").toEqual("GOOD");
          },
        );

        it("Rests within a beat: rests at the beginning of a beat may be combined:", function () {
          _expectRestChk("6/8", "rr.r_.").toEqual("apply 6 r_....");
          _expectRestChk("6/8", "r_.r_.").toEqual("GOOD");
        });

        it(
          "When there are alternative ways of combining rests, it is better to indicate " +
            "the second rather than the third division of the beat, since this clarifies the " +
            "divisions more quickly",
          function () {
            _expectRestChk("6/8", "r___r.r_____").toEqual("GOOD"); // ^^ XXX: wrong
            _expectRestChk("6/8", "r_r__.r_____").toEqual(
              "apply 12 ....r.......",
            ); // ^^ XXX: wrong
            _expectRestChk("6/8", "r_r_r.r_____").toEqual(
              "apply 12 r___........",
            ); // ^^ XXX: wrong
            _expectRestChk("6/8", "r___r.r_____").toEqual("GOOD"); // ^^ XXX: wrong
          },
        );

        it("Rests that follow a beat should expose all three divisions", function () {
          _expectRestChk("6/8", "..r_r_..r_r_").toEqual("GOOD");
        });

        it(
          "If it is important for a performer to sense all three divisions of and " +
            "accompanying part, rests at the beginning of the beat should show these",
          function () {
            // TODO
          },
        );

        it(
          "Otherwise it is better to combine the rests, as this clarifies the position of beats, " +
            "especially in long bars.",
          function () {
            _expectRestChk("9/8", ".rrrr.rr.").toEqual("apply 9 ...r_....");
          },
        );

        it(
          "In the middle of a beat, rests must expose at least two of the three divisions. " +
            "Indicate all three divisions if this is important to the musical sense.",
          function () {
            // TODO
          },
        );
      });
    });
  });

  it("does not allow impossible rest durations", function () {
    _expectRestChk("4/4", "r____...........").toEqual(
      "apply 16 ....r...........",
    );
    _expectRestChk("4/4", "r____...........................").toEqual(
      "apply 32 ....r...........................",
    );
  });
});
