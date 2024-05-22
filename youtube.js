(() => {
  "use strict";
  var e = {
    151: (e, t, n) => {
      n.d(t, { Z: () => r });
      const r = {
        log: (e) => {},
        perm: (e) => {
          console.log(
            "DebugPerm: [92mYTCR EXT [0m- [96mData: [0m" +
              JSON.stringify(e, null, 2)
          );
        },
      };
    },
  },
  t = {};
  function n(r) {
    var d = t[r];
    if (void 0 !== d) return d.exports;
    var a = (t[r] = { exports: {} });
    return e[r](a, a.exports, n), a.exports;
  }
  n.d = (e, t) => {
    for (var r in t)
      n.o(t, r) &&
        !n.o(e, r) &&
        Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  };
  n.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t);

  (() => {
    var e,
      t,
      r = n(151);

    function d() {
      const masthead = document.getElementById("masthead");
      if (!masthead) return;

      const container = masthead.children.container;
      if (!container) return;

      const end = container.children.end;
      if (!end) return;

      let r = document.createElement("yt-icon-button");
      r.id = "ytcr_topnav_div";
      r.setAttribute("class", "style-scope ytd-masthead");
      r.setAttribute("style", " filter: grayscale(100%);");
      r.label = "YTCR Channel Rewards rank";

      let d = document.createElement("button");
      d.id = "ytcr_topnave_button";
      d.setAttribute("aria-label", "YTCR Channel Rewards rank");
      d.setAttribute("class", "style-scope yt-icon-button");

      let a = document.createElement("img");
      a.id = "ytcr_topnave_img";
      a.setAttribute("class", "style-scope ytd-masthead");
      a.setAttribute(
        "style",
        "width: 34px;border-radius: 50%;position: relative; top: -4.9px; left: -4.9px;"
      );
      a.src = e;
      d.appendChild(a);
      r.appendChild(d);
      end.prepend(r);

      (t = document.createElement("div")).innerHTML =
        '<iframe id="ytcr_iframe_ytcr" src="https://youtube.redeems.live" style="width: 520px; height: 84vh; position: fixed; top: 56px; right: 0px; z-index: 9999; display: none;"></iframe>';
      document.body.appendChild(t);
    }

    null === localStorage.getItem("ytcr_image")
      ? setTimeout(() => {
          e = localStorage.getItem("ytcr_image");
          document.getElementById("ytcr_topnav_div") || d();
        }, 1000)
      : ((e = localStorage.getItem("ytcr_image")),
        document.getElementById("ytcr_topnav_div") || d());

    let a = 0,
      l = null;
    window.addEventListener("message", function (e) {
      if (
        (a += 1,
        "ytcr_channel_link" == e.data.type &&
          null != e.data.data &&
          null != e.data.data &&
          "none" != e.data.data)
      ) {
        if (
          ((l = e.data.mystlink),
          document.getElementById("YTCR_MYSTLINK"))
        );
        else if (l) {
          r.Z.log("Mystl.ink: " + l);
          let e = this.document.createElement("div");
          e.id = "YTCR_MYSTLINK";
          e.innerHTML = `\n            <div id="mystlink" style="height: 500px;" class="style-scope ytd-watch-flexy" modern-buttons="" rounded-container="">\n            <iframe style="width:100%;height:100%;border-radius: 12px;" src="https://mystl.ink/${l}?extension=true"></iframe>\n            </div>\n            `;
          document.getElementById("related").prepend(e);
        }
        document.getElementById("ytcr_iframe_ytcr").src =
          "https://youtube.redeems.live/u/" + e.data.data;
        document
          .getElementById("ytcr_topnav_div")
          .setAttribute("style", "filter: grayscale(0%);");
        document.getElementById("ytcr_topnave_button").onclick = function () {
          "none" == document.getElementById("ytcr_iframe_ytcr").style.display
            ? ((document.getElementById("ytcr_iframe_ytcr").style.display =
                "block"),
              (document.getElementById("ytcr_iframe_ytcr").onmouseout =
                function () {
                  document.getElementById("ytcr_iframe_ytcr").style.display =
                    "none";
                  r.Z.log(
                    "mouse " +
                      document.getElementById("ytcr_iframe_ytcr").style.display
                  );
                }))
            : (document.getElementById("ytcr_iframe_ytcr").style.display =
                "none"),
            r.Z.log(
              document.getElementById("ytcr_iframe_ytcr").style.display
            );
        };
      }
    });
  })();
})();
