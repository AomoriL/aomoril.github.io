/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.

  This version is suitable for Node.js.  With minimal changes (the
  exports stuff) it should work on any JS platform.

  This file contains the tokenizer/parser.  It is a port to JavaScript
  of parse-js [1], a JavaScript parser library written in Common Lisp
  by Marijn Haverbeke.  Thank you Marijn!

  [1] http://marijn.haverbeke.nl/parse-js/

  Exported functions:

    - tokenizer(code) -- returns a function.  Call the returned
      function to fetch the next token.

    - parse(code) -- returns an AST of the given JavaScript code.

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2010 (c) Mihai Bazon <mihai.bazon@gmail.com>
    Based on parse-js (http://marijn.haverbeke.nl/parse-js/).

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

(function() {

    /* -----[ Tokenizer (constants) ]----- */

    var KEYWORDS = array_to_hash([
        "break",
        "case",
        "catch",
        "const",
        "continue",
        "default",
        "delete",
        "do",
        "else",
        "finally",
        "for",
        "function",
        "if",
        "in",
        "instanceof",
        "new",
        "return",
        "switch",
        "throw",
        "try",
        "typeof",
        "var",
        "void",
        "while",
        "with"
    ]);

    var RESERVED_WORDS = array_to_hash([
        "abstract",
        "boolean",
        "byte",
        "char",
        "class",
        "debugger",
        "double",
        "enum",
        "export",
        "extends",
        "final",
        "float",
        "goto",
        "implements",
        "import",
        "int",
        "interface",
        "long",
        "native",
        "package",
        "private",
        "protected",
        "public",
        "short",
        "static",
        "super",
        "synchronized",
        "throws",
        "transient",
        "volatile"
    ]);

    var KEYWORDS_BEFORE_EXPRESSION = array_to_hash([
        "return",
        "new",
        "delete",
        "throw",
        "else",
        "case"
    ]);

    var KEYWORDS_ATOM = array_to_hash([
        "false",
        "null",
        "true",
        "undefined"
    ]);

    var OPERATOR_CHARS = array_to_hash(characters("+-*&%=<>!?|~^"));

    var RE_HEX_NUMBER = /^0x[0-9a-f]+$/i;
    var RE_OCT_NUMBER = /^0[0-7]+$/;
    var RE_DEC_NUMBER = /^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i;

    var OPERATORS = array_to_hash([
        "in",
        "instanceof",
        "typeof",
        "new",
        "void",
        "delete",
        "++",
        "--",
        "+",
        "-",
        "!",
        "~",
        "&",
        "|",
        "^",
        "*",
        "/",
        "%",
        ">>",
        "<<",
        ">>>",
        "<",
        ">",
        "<=",
        ">=",
        "==",
        "===",
        "!=",
        "!==",
        "?",
        "=",
        "+=",
        "-=",
        "/=",
        "*=",
        "%=",
        ">>=",
        "<<=",
        ">>>=",
        "|=",
        "^=",
        "&=",
        "&&",
        "||"
    ]);

    var WHITESPACE_CHARS = array_to_hash(characters(" \n\r\t​"));

    var PUNC_BEFORE_EXPRESSION = array_to_hash(characters("[{}(,.;:"));

    var PUNC_CHARS = array_to_hash(characters("[]{}(),;:"));

    var REGEXP_MODIFIERS = array_to_hash(characters("gmsiy"));

    /* -----[ Tokenizer ]----- */

    // regexps adapted from http://xregexp.com/plugins/#unicode
    var UNICODE = {
        letter: new RegExp("[\A-\Z\a-\z\ª\µ\º\À-\Ö\Ø-\ö\ø-\ˁ\ˆ-\ˑ\ˠ-\ˤ\ˬ\ˮ\Ͱ-\ʹ\Ͷ\ͷ\ͺ-\ͽ\Ά\Έ-\Ί\Ό\Ύ-\Ρ\Σ-\ϵ\Ϸ-\ҁ\Ҋ-\ԣ\Ա-\Ֆ\ՙ\ա-\և\א-\ת\װ-\ײ\ء-\ي\ٮ\ٯ\ٱ-\ۓ\ە\ۥ\ۦ\ۮ\ۯ\ۺ-\ۼ\ۿ\ܐ\ܒ-\ܯ\ݍ-\ޥ\ޱ\ߊ-\ߪ\ߴ\ߵ\ߺ\ऄ-\ह\ऽ\ॐ\क़-\ॡ\ॱ\ॲ\ॻ-\ॿ\অ-\ঌ\এ\ঐ\ও-\ন\প-\র\ল\শ-\হ\ঽ\ৎ\ড়\ঢ়\য়-\ৡ\ৰ\ৱ\ਅ-\ਊ\ਏ\ਐ\ਓ-\ਨ\ਪ-\ਰ\ਲ\ਲ਼\ਵ\ਸ਼\ਸ\ਹ\ਖ਼-\ੜ\ਫ਼\ੲ-\ੴ\અ-\ઍ\એ-\ઑ\ઓ-\ન\પ-\ર\લ\ળ\વ-\હ\ઽ\ૐ\ૠ\ૡ\ଅ-\ଌ\ଏ\ଐ\ଓ-\ନ\ପ-\ର\ଲ\ଳ\ଵ-\ହ\ଽ\ଡ଼\ଢ଼\ୟ-\ୡ\ୱ\ஃ\அ-\ஊ\எ-\ஐ\ஒ-\க\ங\ச\ஜ\ஞ\ட\ண\த\ந-\ப\ம-\ஹ\ௐ\అ-\ఌ\ఎ-\ఐ\ఒ-\న\ప-\ళ\వ-\హ\ఽ\ౘ\ౙ\ౠ\ౡ\ಅ-\ಌ\ಎ-\ಐ\ಒ-\ನ\ಪ-\ಳ\ವ-\ಹ\ಽ\ೞ\ೠ\ೡ\അ-\ഌ\എ-\ഐ\ഒ-\ന\പ-\ഹ\ഽ\ൠ\ൡ\ൺ-\ൿ\අ-\ඖ\ක-\න\ඳ-\ර\ල\ව-\ෆ\ก-\ะ\า\ำ\เ-\ๆ\ກ\ຂ\ຄ\ງ\ຈ\ຊ\ຍ\ດ-\ທ\ນ-\ຟ\ມ-\ຣ\ລ\ວ\ສ\ຫ\ອ-\ະ\າ\ຳ\ຽ\ເ-\ໄ\ໆ\ໜ\ໝ\ༀ\ཀ-\ཇ\ཉ-\ཬ\ྈ-\ྋ\က-\ဪ\ဿ\ၐ-\ၕ\ၚ-\ၝ\ၡ\ၥ\ၦ\ၮ-\ၰ\ၵ-\ႁ\ႎ\Ⴀ-\Ⴥ\ა-\ჺ\ჼ\ᄀ-\ᅙ\ᅟ-\ᆢ\ᆨ-\ᇹ\ሀ-\ቈ\ቊ-\ቍ\ቐ-\ቖ\ቘ\ቚ-\ቝ\በ-\ኈ\ኊ-\ኍ\ነ-\ኰ\ኲ-\ኵ\ኸ-\ኾ\ዀ\ዂ-\ዅ\ወ-\ዖ\ዘ-\ጐ\ጒ-\ጕ\ጘ-\ፚ\ᎀ-\ᎏ\Ꭰ-\Ᏼ\ᐁ-\ᙬ\ᙯ-\ᙶ\ᚁ-\ᚚ\ᚠ-\ᛪ\ᜀ-\ᜌ\ᜎ-\ᜑ\ᜠ-\ᜱ\ᝀ-\ᝑ\ᝠ-\ᝬ\ᝮ-\ᝰ\ក-\ឳ\ៗ\ៜ\ᠠ-\ᡷ\ᢀ-\ᢨ\ᢪ\ᤀ-\ᤜ\ᥐ-\ᥭ\ᥰ-\ᥴ\ᦀ-\ᦩ\ᧁ-\ᧇ\ᨀ-\ᨖ\ᬅ-\ᬳ\ᭅ-\ᭋ\ᮃ-\ᮠ\ᮮ\ᮯ\ᰀ-\ᰣ\ᱍ-\ᱏ\ᱚ-\ᱽ\ᴀ-\ᶿ\Ḁ-\ἕ\Ἐ-\Ἕ\ἠ-\ὅ\Ὀ-\Ὅ\ὐ-\ὗ\Ὑ\Ὓ\Ὕ\Ὗ-\ώ\ᾀ-\ᾴ\ᾶ-\ᾼ\ι\ῂ-\ῄ\ῆ-\ῌ\ῐ-\ΐ\ῖ-\Ί\ῠ-\Ῥ\ῲ-\ῴ\ῶ-\ῼ\ⁱ\ⁿ\ₐ-\ₔ\ℂ\ℇ\ℊ-\ℓ\ℕ\ℙ-\ℝ\ℤ\Ω\ℨ\K-\ℭ\ℯ-\ℹ\ℼ-\ℿ\ⅅ-\ⅉ\ⅎ\Ↄ\ↄ\Ⰰ-\Ⱞ\ⰰ-\ⱞ\Ⱡ-\Ɐ\ⱱ-\ⱽ\Ⲁ-\ⳤ\ⴀ-\ⴥ\ⴰ-\ⵥ\ⵯ\ⶀ-\ⶖ\ⶠ-\ⶦ\ⶨ-\ⶮ\ⶰ-\ⶶ\ⶸ-\ⶾ\ⷀ-\ⷆ\ⷈ-\ⷎ\ⷐ-\ⷖ\ⷘ-\ⷞ\ⸯ\々\〆\〱-\〵\〻\〼\ぁ-\ゖ\ゝ-\ゟ\ァ-\ヺ\ー-\ヿ\ㄅ-\ㄭ\ㄱ-\ㆎ\ㆠ-\ㆷ\ㇰ-\ㇿ\㐀\䶵\一\鿃\ꀀ-\ꒌ\ꔀ-\ꘌ\ꘐ-\ꘟ\ꘪ\ꘫ\Ꙁ-\ꙟ\Ꙣ-\ꙮ\ꙿ-\ꚗ\ꜗ-\ꜟ\Ꜣ-\ꞈ\Ꞌ\ꞌ\ꟻ-\ꠁ\ꠃ-\ꠅ\ꠇ-\ꠊ\ꠌ-\ꠢ\ꡀ-\ꡳ\ꢂ-\ꢳ\ꤊ-\ꤥ\ꤰ-\ꥆ\ꨀ-\ꨨ\ꩀ-\ꩂ\ꩄ-\ꩋ\가\힣\豈-\鶴\侮-\頻\並-\龎\ﬀ-\ﬆ\ﬓ-\ﬗ\יִ\ײַ-\ﬨ\שׁ-\זּ\טּ-\לּ\מּ\נּ\סּ\ףּ\פּ\צּ-\ﮱ\ﯓ-\ﴽ\ﵐ-\ﶏ\ﶒ-\ﷇ\ﷰ-\ﷻ\ﹰ-\ﹴ\ﹶ-\ﻼ\Ａ-\Ｚ\ａ-\ｚ\ｦ-\ﾾ\ￂ-\ￇ\ￊ-\ￏ\ￒ-\ￗ\ￚ-\ￜ]"),
        non_spacing_mark: new RegExp("[\̀-\ͯ\҃-\҇\֑-\ֽ\ֿ\ׁ\ׂ\ׄ\ׅ\ׇ\ؐ-\ؚ\ً-\ٞ\ٰ\ۖ-\ۜ\۟-\ۤ\ۧ\ۨ\۪-\ۭ\ܑ\ܰ-\݊\ަ-\ް\߫-\߳\ࠖ-\࠙\ࠛ-\ࠣ\ࠥ-\ࠧ\ࠩ-\࠭\ऀ-\ं\़\ु-\ै\्\॑-\ॕ\ॢ\ॣ\ঁ\়\ু-\ৄ\্\ৢ\ৣ\ਁ\ਂ\਼\ੁ\ੂ\ੇ\ੈ\ੋ-\੍\ੑ\ੰ\ੱ\ੵ\ઁ\ં\઼\ુ-\ૅ\ે\ૈ\્\ૢ\ૣ\ଁ\଼\ି\ୁ-\ୄ\୍\ୖ\ୢ\ୣ\ஂ\ீ\்\ా-\ీ\ె-\ై\ొ-\్\ౕ\ౖ\ౢ\ౣ\಼\ಿ\ೆ\ೌ\್\ೢ\ೣ\ു-\ൄ\്\ൢ\ൣ\්\ි-\ු\ූ\ั\ิ-\ฺ\็-\๎\ັ\ິ-\ູ\ົ\ຼ\່-\ໍ\༘\༙\༵\༷\༹\ཱ-\ཾ\ྀ-\྄\྆\྇\ྐ-\ྗ\ྙ-\ྼ\࿆\ိ-\ူ\ဲ-\့\္\်\ွ\ှ\ၘ\ၙ\ၞ-\ၠ\ၱ-\ၴ\ႂ\ႅ\ႆ\ႍ\ႝ\፟\ᜒ-\᜔\ᜲ-\᜴\ᝒ\ᝓ\ᝲ\ᝳ\ិ-\ួ\ំ\៉-\៓\៝\᠋-\᠍\ᢩ\ᤠ-\ᤢ\ᤧ\ᤨ\ᤲ\᤹-\᤻\ᨗ\ᨘ\ᩖ\ᩘ-\ᩞ\᩠\ᩢ\ᩥ-\ᩬ\ᩳ-\᩼\᩿\ᬀ-\ᬃ\᬴\ᬶ-\ᬺ\ᬼ\ᭂ\᭫-\᭳\ᮀ\ᮁ\ᮢ-\ᮥ\ᮨ\ᮩ\ᰬ-\ᰳ\ᰶ\᰷\᳐-\᳒\᳔-\᳠\᳢-\᳨\᳭\᷀-\ᷦ\᷽-\᷿\⃐-\⃜\⃡\⃥-\⃰\⳯-\⳱\ⷠ-\ⷿ\〪-\〯\゙\゚\꙯\꙼\꙽\꛰\꛱\ꠂ\꠆\ꠋ\ꠥ\ꠦ\꣄\꣠-\꣱\ꤦ-\꤭\ꥇ-\ꥑ\ꦀ-\ꦂ\꦳\ꦶ-\ꦹ\ꦼ\ꨩ-\ꨮ\ꨱ\ꨲ\ꨵ\ꨶ\ꩃ\ꩌ\ꪰ\ꪲ-\ꪴ\ꪷ\ꪸ\ꪾ\꪿\꫁\ꯥ\ꯨ\꯭\ﬞ\︀-\️\︠-\︦]"),
        space_combining_mark: new RegExp("[\ः\ा-\ी\ॉ-\ौ\ॎ\ং\ঃ\া-\ী\ে\ৈ\ো\ৌ\ৗ\ਃ\ਾ-\ੀ\ઃ\ા-\ી\ૉ\ો\ૌ\ଂ\ଃ\ା\ୀ\େ\ୈ\ୋ\ୌ\ୗ\ா\ி\ு\ூ\ெ-\ை\ொ-\ௌ\ௗ\ఁ-\ః\ు-\ౄ\ಂ\ಃ\ಾ\ೀ-\ೄ\ೇ\ೈ\ೊ\ೋ\ೕ\ೖ\ം\ഃ\ാ-\ീ\െ-\ൈ\ൊ-\ൌ\ൗ\ං\ඃ\ා-\ෑ\ෘ-\ෟ\ෲ\ෳ\༾\༿\ཿ\ါ\ာ\ေ\း\ျ\ြ\ၖ\ၗ\ၢ-\ၤ\ၧ-\ၭ\ႃ\ႄ\ႇ-\ႌ\ႏ\ႚ-\ႜ\ា\ើ-\ៅ\ះ\ៈ\ᤣ-\ᤦ\ᤩ-\ᤫ\ᤰ\ᤱ\ᤳ-\ᤸ\ᦰ-\ᧀ\ᧈ\ᧉ\ᨙ-\ᨛ\ᩕ\ᩗ\ᩡ\ᩣ\ᩤ\ᩭ-\ᩲ\ᬄ\ᬵ\ᬻ\ᬽ-\ᭁ\ᭃ\᭄\ᮂ\ᮡ\ᮦ\ᮧ\᮪\ᰤ-\ᰫ\ᰴ\ᰵ\᳡\ᳲ\ꠣ\ꠤ\ꠧ\ꢀ\ꢁ\ꢴ-\ꣃ\ꥒ\꥓\ꦃ\ꦴ\ꦵ\ꦺ\ꦻ\ꦽ-\꧀\ꨯ\ꨰ\ꨳ\ꨴ\ꩍ\ꩻ\ꯣ\ꯤ\ꯦ\ꯧ\ꯩ\ꯪ\꯬]"),
        connector_punctuation: new RegExp("[\_\‿\⁀\⁔\︳\︴\﹍-\﹏\＿]")
    };

    function is_letter(ch) {
        return UNICODE.letter.test(ch);
    };

    function is_digit(ch) {
        ch = ch.charCodeAt(0);
        return ch >= 48 && ch <= 57; //XXX: find out if "UnicodeDigit" means something else than 0..9
    };

    function is_alphanumeric_char(ch) {
        return is_digit(ch) || is_letter(ch);
    };

    function is_unicode_combining_mark(ch) {
        return UNICODE.non_spacing_mark.test(ch) || UNICODE.space_combining_mark.test(ch);
    };

    function is_unicode_connector_punctuation(ch) {
        return UNICODE.connector_punctuation.test(ch);
    };

    function is_identifier_start(ch) {
        return ch == "$" || ch == "_" || is_letter(ch);
    };

    function is_identifier_char(ch) {
        return is_identifier_start(ch) || is_unicode_combining_mark(ch) || is_digit(ch) || is_unicode_connector_punctuation(ch) || ch == "‌" // zero-width non-joiner <ZWNJ>
            || ch == "‍" // zero-width joiner <ZWJ> (in my ECMA-262 PDF, this is also 200c)
        ;
    };

    function parse_js_number(num) {
        if (RE_HEX_NUMBER.test(num)) {
            return parseInt(num.substr(2), 16);
        } else if (RE_OCT_NUMBER.test(num)) {
            return parseInt(num.substr(1), 8);
        } else if (RE_DEC_NUMBER.test(num)) {
            return parseFloat(num);
        }
    };

    function JS_Parse_Error(message, line, col, pos) {
        this.message = message;
        this.line = line;
        this.col = col;
        this.pos = pos;
        try {
            ({})();
        } catch (ex) {
            this.stack = ex.stack;
        };
    };

    JS_Parse_Error.prototype.toString = function() {
        return this.message + " (line: " + this.line + ", col: " + this.col + ", pos: " + this.pos + ")" + "\n\n" + this.stack;
    };

    function js_error(message, line, col, pos) {
        throw new JS_Parse_Error(message, line, col, pos);
    };

    function is_token(token, type, val) {
        return token.type == type && (val == null || token.value == val);
    };

    var EX_EOF = {};

    function tokenizer($TEXT) {

        var S = {
            text: $TEXT.replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/^\uFEFF/, ''),
            pos: 0,
            tokpos: 0,
            line: 0,
            tokline: 0,
            col: 0,
            tokcol: 0,
            newline_before: false,
            regex_allowed: false,
            comments_before: []
        };

        function peek() {
            return S.text.charAt(S.pos);
        };

        function next(signal_eof) {
            var ch = S.text.charAt(S.pos++);
            if (signal_eof && !ch)
                throw EX_EOF;
            if (ch == "\n") {
                S.newline_before = true;
                ++S.line;
                S.col = 0;
            } else {
                ++S.col;
            }
            return ch;
        };

        function eof() {
            return !S.peek();
        };

        function find(what, signal_eof) {
            var pos = S.text.indexOf(what, S.pos);
            if (signal_eof && pos == -1) throw EX_EOF;
            return pos;
        };

        function start_token() {
            S.tokline = S.line;
            S.tokcol = S.col;
            S.tokpos = S.pos;
        };

        function token(type, value, is_comment) {
            S.regex_allowed = ((type == "operator" && !HOP(UNARY_POSTFIX, value)) ||
                (type == "keyword" && HOP(KEYWORDS_BEFORE_EXPRESSION, value)) ||
                (type == "punc" && HOP(PUNC_BEFORE_EXPRESSION, value)));
            var ret = {
                type: type,
                value: value,
                line: S.tokline,
                col: S.tokcol,
                pos: S.tokpos,
                nlb: S.newline_before
            };
            if (!is_comment) {
                ret.comments_before = S.comments_before;
                S.comments_before = [];
            }
            S.newline_before = false;
            return ret;
        };

        function skip_whitespace() {
            while (HOP(WHITESPACE_CHARS, peek()))
                next();
        };

        function read_while(pred) {
            var ret = "",
                ch = peek(),
                i = 0;
            while (ch && pred(ch, i++)) {
                ret += next();
                ch = peek();
            }
            return ret;
        };

        function parse_error(err) {
            js_error(err, S.tokline, S.tokcol, S.tokpos);
        };

        function read_num(prefix) {
            var has_e = false,
                after_e = false,
                has_x = false,
                has_dot = prefix == ".";
            var num = read_while(function(ch, i) {
                if (ch == "x" || ch == "X") {
                    if (has_x) return false;
                    return has_x = true;
                }
                if (!has_x && (ch == "E" || ch == "e")) {
                    if (has_e) return false;
                    return has_e = after_e = true;
                }
                if (ch == "-") {
                    if (after_e || (i == 0 && !prefix)) return true;
                    return false;
                }
                if (ch == "+") return after_e;
                after_e = false;
                if (ch == ".") {
                    if (!has_dot && !has_x)
                        return has_dot = true;
                    return false;
                }
                return is_alphanumeric_char(ch);
            });
            if (prefix)
                num = prefix + num;
            var valid = parse_js_number(num);
            if (!isNaN(valid)) {
                return token("num", valid);
            } else {
                parse_error("Invalid syntax: " + num);
            }
        };

        function read_escaped_char() {
            var ch = next(true);
            switch (ch) {
                case "n":
                    return "\n";
                case "r":
                    return "\r";
                case "t":
                    return "\t";
                case "b":
                    return "\b";
                case "v":
                    return "\v";
                case "f":
                    return "\f";
                case "0":
                    return "\0";
                case "x":
                    return String.fromCharCode(hex_bytes(2));
                case "u":
                    return String.fromCharCode(hex_bytes(4));
                default:
                    return ch;
            }
        };

        function hex_bytes(n) {
            var num = 0;
            for (; n > 0; --n) {
                var digit = parseInt(next(true), 16);
                if (isNaN(digit))
                    parse_error("Invalid hex-character pattern in string");
                num = (num << 4) | digit;
            }
            return num;
        };

        function read_string() {
            return with_eof_error("Unterminated string constant", function() {
                var quote = next(),
                    ret = "";
                for (;;) {
                    var ch = next(true);
                    if (ch == "\\") ch = read_escaped_char();
                    else if (ch == quote) break;
                    ret += ch;
                }
                return token("string", ret);
            });
        };

        function read_line_comment() {
            next();
            var i = find("\n"),
                ret;
            if (i == -1) {
                ret = S.text.substr(S.pos);
                S.pos = S.text.length;
            } else {
                ret = S.text.substring(S.pos, i);
                S.pos = i;
            }
            return token("comment1", ret, true);
        };

        function read_multiline_comment() {
            next();
            return with_eof_error("Unterminated multiline comment", function() {
                var i = find("*/", true),
                    text = S.text.substring(S.pos, i),
                    tok = token("comment2", text, true);
                S.pos = i + 2;
                S.line += text.split("\n").length - 1;
                S.newline_before = text.indexOf("\n") >= 0;

                // https://github.com/mishoo/UglifyJS/issues/#issue/100
                if (/^@cc_on/i.test(text)) {
                    warn("WARNING: at line " + S.line);
                    warn("*** Found \"conditional comment\": " + text);
                    warn("*** UglifyJS DISCARDS ALL COMMENTS.  This means your code might no longer work properly in Internet Explorer.");
                }

                return tok;
            });
        };

        function read_name() {
            var backslash = false,
                name = "",
                ch;
            while ((ch = peek()) != null) {
                if (!backslash) {
                    if (ch == "\\") backslash = true, next();
                    else if (is_identifier_char(ch)) name += next();
                    else break;
                } else {
                    if (ch != "u") parse_error("Expecting UnicodeEscapeSequence -- uXXXX");
                    ch = read_escaped_char();
                    if (!is_identifier_char(ch)) parse_error("Unicode char: " + ch.charCodeAt(0) + " is not valid in identifier");
                    name += ch;
                    backslash = false;
                }
            }
            return name;
        };

        function read_regexp() {
            return with_eof_error("Unterminated regular expression", function() {
                var prev_backslash = false,
                    regexp = "",
                    ch, in_class = false;
                while ((ch = next(true)))
                    if (prev_backslash) {
                        regexp += "\\" + ch;
                        prev_backslash = false;
                    } else if (ch == "[") {
                    in_class = true;
                    regexp += ch;
                } else if (ch == "]" && in_class) {
                    in_class = false;
                    regexp += ch;
                } else if (ch == "/" && !in_class) {
                    break;
                } else if (ch == "\\") {
                    prev_backslash = true;
                } else {
                    regexp += ch;
                }
                var mods = read_name();
                return token("regexp", [regexp, mods]);
            });
        };

        function read_operator(prefix) {
            function grow(op) {
                if (!peek()) return op;
                var bigger = op + peek();
                if (HOP(OPERATORS, bigger)) {
                    next();
                    return grow(bigger);
                } else {
                    return op;
                }
            };
            return token("operator", grow(prefix || next()));
        };

        function handle_slash() {
            next();
            var regex_allowed = S.regex_allowed;
            switch (peek()) {
                case "/":
                    S.comments_before.push(read_line_comment());
                    S.regex_allowed = regex_allowed;
                    return next_token();
                case "*":
                    S.comments_before.push(read_multiline_comment());
                    S.regex_allowed = regex_allowed;
                    return next_token();
            }
            return S.regex_allowed ? read_regexp() : read_operator("/");
        };

        function handle_dot() {
            next();
            return is_digit(peek()) ? read_num(".") : token("punc", ".");
        };

        function read_word() {
            var word = read_name();
            return !HOP(KEYWORDS, word) ? token("name", word) : HOP(OPERATORS, word) ? token("operator", word) : HOP(KEYWORDS_ATOM, word) ? token("atom", word) : token("keyword", word);
        };

        function with_eof_error(eof_error, cont) {
            try {
                return cont();
            } catch (ex) {
                if (ex === EX_EOF) parse_error(eof_error);
                else throw ex;
            }
        };

        function next_token(force_regexp) {
            if (force_regexp)
                return read_regexp();
            skip_whitespace();
            start_token();
            var ch = peek();
            if (!ch) return token("eof");
            if (is_digit(ch)) return read_num();
            if (ch == '"' || ch == "'") return read_string();
            if (HOP(PUNC_CHARS, ch)) return token("punc", next());
            if (ch == ".") return handle_dot();
            if (ch == "/") return handle_slash();
            if (HOP(OPERATOR_CHARS, ch)) return read_operator();
            if (ch == "\\" || is_identifier_start(ch)) return read_word();
            parse_error("Unexpected character '" + ch + "'");
        };

        next_token.context = function(nc) {
            if (nc) S = nc;
            return S;
        };

        return next_token;

    };

    /* -----[ Parser (constants) ]----- */

    var UNARY_PREFIX = array_to_hash([
        "typeof",
        "void",
        "delete",
        "--",
        "++",
        "!",
        "~",
        "-",
        "+"
    ]);

    var UNARY_POSTFIX = array_to_hash(["--", "++"]);

    var ASSIGNMENT = (function(a, ret, i) {
        while (i < a.length) {
            ret[a[i]] = a[i].substr(0, a[i].length - 1);
            i++;
        }
        return ret;
    })(
        ["+=", "-=", "/=", "*=", "%=", ">>=", "<<=", ">>>=", "|=", "^=", "&="], {
            "=": true
        },
        0
    );

    var PRECEDENCE = (function(a, ret) {
        for (var i = 0, n = 1; i < a.length; ++i, ++n) {
            var b = a[i];
            for (var j = 0; j < b.length; ++j) {
                ret[b[j]] = n;
            }
        }
        return ret;
    })(
        [
            ["||"],
            ["&&"],
            ["|"],
            ["^"],
            ["&"],
            ["==", "===", "!=", "!=="],
            ["<", ">", "<=", ">=", "in", "instanceof"],
            [">>", "<<", ">>>"],
            ["+", "-"],
            ["*", "/", "%"]
        ], {}
    );

    var STATEMENTS_WITH_LABELS = array_to_hash(["for", "do", "while", "switch"]);

    var ATOMIC_START_TOKEN = array_to_hash(["atom", "num", "string", "regexp", "name"]);

    /* -----[ Parser ]----- */

    function NodeWithToken(str, start, end) {
        this.name = str;
        this.start = start;
        this.end = end;
    };

    NodeWithToken.prototype.toString = function() {
        return this.name;
    };

    function parse($TEXT, exigent_mode, embed_tokens) {

        var S = {
            input: typeof $TEXT == "string" ? tokenizer($TEXT, true) : $TEXT,
            token: null,
            prev: null,
            peeked: null,
            in_function: 0,
            in_loop: 0,
            labels: []
        };

        S.token = next();

        function is(type, value) {
            return is_token(S.token, type, value);
        };

        function peek() {
            return S.peeked || (S.peeked = S.input());
        };

        function next() {
            S.prev = S.token;
            if (S.peeked) {
                S.token = S.peeked;
                S.peeked = null;
            } else {
                S.token = S.input();
            }
            return S.token;
        };

        function prev() {
            return S.prev;
        };

        function croak(msg, line, col, pos) {
            var ctx = S.input.context();
            js_error(msg,
                line != null ? line : ctx.tokline,
                col != null ? col : ctx.tokcol,
                pos != null ? pos : ctx.tokpos);
        };

        function token_error(token, msg) {
            croak(msg, token.line, token.col);
        };

        function unexpected(token) {
            if (token == null)
                token = S.token;
            token_error(token, "Unexpected token: " + token.type + " (" + token.value + ")");
        };

        function expect_token(type, val) {
            if (is(type, val)) {
                return next();
            }
            token_error(S.token, "Unexpected token " + S.token.type + ", expected " + type);
        };

        function expect(punc) {
            return expect_token("punc", punc);
        };

        function can_insert_semicolon() {
            return !exigent_mode && (
                S.token.nlb || is("eof") || is("punc", "}")
            );
        };

        function semicolon() {
            if (is("punc", ";")) next();
            else if (!can_insert_semicolon()) unexpected();
        };

        function as() {
            return slice(arguments);
        };

        function parenthesised() {
            expect("(");
            var ex = expression();
            expect(")");
            return ex;
        };

        function add_tokens(str, start, end) {
            return str instanceof NodeWithToken ? str : new NodeWithToken(str, start, end);
        };

        var statement = embed_tokens ? function() {
            var start = S.token;
            var ast = $statement.apply(this, arguments);
            ast[0] = add_tokens(ast[0], start, prev());
            return ast;
        } : $statement;

        function $statement() {
            if (is("operator", "/")) {
                S.peeked = null;
                S.token = S.input(true); // force regexp
            }
            switch (S.token.type) {
                case "num":
                case "string":
                case "regexp":
                case "operator":
                case "atom":
                    return simple_statement();

                case "name":
                    return is_token(peek(), "punc", ":") ? labeled_statement(prog1(S.token.value, next, next)) : simple_statement();

                case "punc":
                    switch (S.token.value) {
                        case "{":
                            return as("block", block_());
                        case "[":
                        case "(":
                            return simple_statement();
                        case ";":
                            next();
                            return as("block");
                        default:
                            unexpected();
                    }

                case "keyword":
                    switch (prog1(S.token.value, next)) {
                        case "break":
                            return break_cont("break");

                        case "continue":
                            return break_cont("continue");

                        case "debugger":
                            semicolon();
                            return as("debugger");

                        case "do":
                            return (function(body) {
                                expect_token("keyword", "while");
                                return as("do", prog1(parenthesised, semicolon), body);
                            })(in_loop(statement));

                        case "for":
                            return for_();

                        case "function":
                            return function_(true);

                        case "if":
                            return if_();

                        case "return":
                            if (S.in_function == 0)
                                croak("'return' outside of function");
                            return as("return",
                                is("punc", ";") ? (next(), null) : can_insert_semicolon() ? null : prog1(expression, semicolon));

                        case "switch":
                            return as("switch", parenthesised(), switch_block_());

                        case "throw":
                            return as("throw", prog1(expression, semicolon));

                        case "try":
                            return try_();

                        case "var":
                            return prog1(var_, semicolon);

                        case "const":
                            return prog1(const_, semicolon);

                        case "while":
                            return as("while", parenthesised(), in_loop(statement));

                        case "with":
                            return as("with", parenthesised(), statement());

                        default:
                            unexpected();
                    }
            }
        };

        function labeled_statement(label) {
            S.labels.push(label);
            var start = S.token,
                stat = statement();
            if (exigent_mode && !HOP(STATEMENTS_WITH_LABELS, stat[0]))
                unexpected(start);
            S.labels.pop();
            return as("label", label, stat);
        };

        function simple_statement() {
            return as("stat", prog1(expression, semicolon));
        };

        function break_cont(type) {
            var name = is("name") ? S.token.value : null;
            if (name != null) {
                next();
                if (!member(name, S.labels))
                    croak("Label " + name + " without matching loop or statement");
            } else if (S.in_loop == 0)
                croak(type + " not inside a loop or switch");
            semicolon();
            return as(type, name);
        };

        function for_() {
            expect("(");
            var init = null;
            if (!is("punc", ";")) {
                init = is("keyword", "var") ? (next(), var_(true)) : expression(true, true);
                if (is("operator", "in"))
                    return for_in(init);
            }
            return regular_for(init);
        };

        function regular_for(init) {
            expect(";");
            var test = is("punc", ";") ? null : expression();
            expect(";");
            var step = is("punc", ")") ? null : expression();
            expect(")");
            return as("for", init, test, step, in_loop(statement));
        };

        function for_in(init) {
            var lhs = init[0] == "var" ? as("name", init[1][0]) : init;
            next();
            var obj = expression();
            expect(")");
            return as("for-in", init, lhs, obj, in_loop(statement));
        };

        var function_ = embed_tokens ? function() {
            var start = prev();
            var ast = $function_.apply(this, arguments);
            ast[0] = add_tokens(ast[0], start, prev());
            return ast;
        } : $function_;

        function $function_(in_statement) {
            var name = is("name") ? prog1(S.token.value, next) : null;
            if (in_statement && !name)
                unexpected();
            expect("(");
            return as(in_statement ? "defun" : "function",
                name,
                // arguments
                (function(first, a) {
                    while (!is("punc", ")")) {
                        if (first) first = false;
                        else expect(",");
                        if (!is("name")) unexpected();
                        a.push(S.token.value);
                        next();
                    }
                    next();
                    return a;
                })(true, []),
                // body
                (function() {
                    ++S.in_function;
                    var loop = S.in_loop;
                    S.in_loop = 0;
                    var a = block_();
                    --S.in_function;
                    S.in_loop = loop;
                    return a;
                })());
        };

        function if_() {
            var cond = parenthesised(),
                body = statement(),
                belse;
            if (is("keyword", "else")) {
                next();
                belse = statement();
            }
            return as("if", cond, body, belse);
        };

        function block_() {
            expect("{");
            var a = [];
            while (!is("punc", "}")) {
                if (is("eof")) unexpected();
                a.push(statement());
            }
            next();
            return a;
        };

        var switch_block_ = curry(in_loop, function() {
            expect("{");
            var a = [],
                cur = null;
            while (!is("punc", "}")) {
                if (is("eof")) unexpected();
                if (is("keyword", "case")) {
                    next();
                    cur = [];
                    a.push([expression(), cur]);
                    expect(":");
                } else if (is("keyword", "default")) {
                    next();
                    expect(":");
                    cur = [];
                    a.push([null, cur]);
                } else {
                    if (!cur) unexpected();
                    cur.push(statement());
                }
            }
            next();
            return a;
        });

        function try_() {
            var body = block_(),
                bcatch, bfinally;
            if (is("keyword", "catch")) {
                next();
                expect("(");
                if (!is("name"))
                    croak("Name expected");
                var name = S.token.value;
                next();
                expect(")");
                bcatch = [name, block_()];
            }
            if (is("keyword", "finally")) {
                next();
                bfinally = block_();
            }
            if (!bcatch && !bfinally)
                croak("Missing catch/finally blocks");
            return as("try", body, bcatch, bfinally);
        };

        function vardefs(no_in) {
            var a = [];
            for (;;) {
                if (!is("name"))
                    unexpected();
                var name = S.token.value;
                next();
                if (is("operator", "=")) {
                    next();
                    a.push([name, expression(false, no_in)]);
                } else {
                    a.push([name]);
                }
                if (!is("punc", ","))
                    break;
                next();
            }
            return a;
        };

        function var_(no_in) {
            return as("var", vardefs(no_in));
        };

        function const_() {
            return as("const", vardefs());
        };

        function new_() {
            var newexp = expr_atom(false),
                args;
            if (is("punc", "(")) {
                next();
                args = expr_list(")");
            } else {
                args = [];
            }
            return subscripts(as("new", newexp, args), true);
        };

        function expr_atom(allow_calls) {
            if (is("operator", "new")) {
                next();
                return new_();
            }
            if (is("operator") && HOP(UNARY_PREFIX, S.token.value)) {
                return make_unary("unary-prefix",
                    prog1(S.token.value, next),
                    expr_atom(allow_calls));
            }
            if (is("punc")) {
                switch (S.token.value) {
                    case "(":
                        next();
                        return subscripts(prog1(expression, curry(expect, ")")), allow_calls);
                    case "[":
                        next();
                        return subscripts(array_(), allow_calls);
                    case "{":
                        next();
                        return subscripts(object_(), allow_calls);
                }
                unexpected();
            }
            if (is("keyword", "function")) {
                next();
                return subscripts(function_(false), allow_calls);
            }
            if (HOP(ATOMIC_START_TOKEN, S.token.type)) {
                var atom = S.token.type == "regexp" ? as("regexp", S.token.value[0], S.token.value[1]) : as(S.token.type, S.token.value);
                return subscripts(prog1(atom, next), allow_calls);
            }
            unexpected();
        };

        function expr_list(closing, allow_trailing_comma, allow_empty) {
            var first = true,
                a = [];
            while (!is("punc", closing)) {
                if (first) first = false;
                else expect(",");
                if (allow_trailing_comma && is("punc", closing)) break;
                if (is("punc", ",") && allow_empty) {
                    a.push(["atom", "undefined"]);
                } else {
                    a.push(expression(false));
                }
            }
            next();
            return a;
        };

        function array_() {
            return as("array", expr_list("]", !exigent_mode, true));
        };

        function object_() {
            var first = true,
                a = [];
            while (!is("punc", "}")) {
                if (first) first = false;
                else expect(",");
                if (!exigent_mode && is("punc", "}"))
                // allow trailing comma
                    break;
                var type = S.token.type;
                var name = as_property_name();
                if (type == "name" && (name == "get" || name == "set") && !is("punc", ":")) {
                    a.push([as_name(), function_(false), name]);
                } else {
                    expect(":");
                    a.push([name, expression(false)]);
                }
            }
            next();
            return as("object", a);
        };

        function as_property_name() {
            switch (S.token.type) {
                case "num":
                case "string":
                    return prog1(S.token.value, next);
            }
            return as_name();
        };

        function as_name() {
            switch (S.token.type) {
                case "name":
                case "operator":
                case "keyword":
                case "atom":
                    return prog1(S.token.value, next);
                default:
                    unexpected();
            }
        };

        function subscripts(expr, allow_calls) {
            if (is("punc", ".")) {
                next();
                return subscripts(as("dot", expr, as_name()), allow_calls);
            }
            if (is("punc", "[")) {
                next();
                return subscripts(as("sub", expr, prog1(expression, curry(expect, "]"))), allow_calls);
            }
            if (allow_calls && is("punc", "(")) {
                next();
                return subscripts(as("call", expr, expr_list(")")), true);
            }
            if (allow_calls && is("operator") && HOP(UNARY_POSTFIX, S.token.value)) {
                return prog1(curry(make_unary, "unary-postfix", S.token.value, expr),
                    next);
            }
            return expr;
        };

        function make_unary(tag, op, expr) {
            if ((op == "++" || op == "--") && !is_assignable(expr))
                croak("Invalid use of " + op + " operator");
            return as(tag, op, expr);
        };

        function expr_op(left, min_prec, no_in) {
            var op = is("operator") ? S.token.value : null;
            if (op && op == "in" && no_in) op = null;
            var prec = op != null ? PRECEDENCE[op] : null;
            if (prec != null && prec > min_prec) {
                next();
                var right = expr_op(expr_atom(true), prec, no_in);
                return expr_op(as("binary", op, left, right), min_prec, no_in);
            }
            return left;
        };

        function expr_ops(no_in) {
            return expr_op(expr_atom(true), 0, no_in);
        };

        function maybe_conditional(no_in) {
            var expr = expr_ops(no_in);
            if (is("operator", "?")) {
                next();
                var yes = expression(false);
                expect(":");
                return as("conditional", expr, yes, expression(false, no_in));
            }
            return expr;
        };

        function is_assignable(expr) {
            if (!exigent_mode) return true;
            switch (expr[0]) {
                case "dot":
                case "sub":
                case "new":
                case "call":
                    return true;
                case "name":
                    return expr[1] != "this";
            }
        };

        function maybe_assign(no_in) {
            var left = maybe_conditional(no_in),
                val = S.token.value;
            if (is("operator") && HOP(ASSIGNMENT, val)) {
                if (is_assignable(left)) {
                    next();
                    return as("assign", ASSIGNMENT[val], left, maybe_assign(no_in));
                }
                croak("Invalid assignment");
            }
            return left;
        };

        function expression(commas, no_in) {
            if (arguments.length == 0)
                commas = true;
            var expr = maybe_assign(no_in);
            if (commas && is("punc", ",")) {
                next();
                return as("seq", expr, expression(true, no_in));
            }
            return expr;
        };

        function in_loop(cont) {
            try {
                ++S.in_loop;
                return cont();
            } finally {
                --S.in_loop;
            }
        };

        return as("toplevel", (function(a) {
            while (!is("eof"))
                a.push(statement());
            return a;
        })([]));

    };

    /* -----[ Utilities ]----- */

    function curry(f) {
        var args = slice(arguments, 1);
        return function() {
            return f.apply(this, args.concat(slice(arguments)));
        };
    };

    function prog1(ret) {
        if (ret instanceof Function)
            ret = ret();
        for (var i = 1, n = arguments.length; --n > 0; ++i)
            arguments[i]();
        return ret;
    };

    function array_to_hash(a) {
        var ret = {};
        for (var i = 0; i < a.length; ++i)
            ret[a[i]] = true;
        return ret;
    };

    function slice(a, start) {
        return Array.prototype.slice.call(a, start == null ? 0 : start);
    };

    function characters(str) {
        return str.split("");
    };

    function member(name, array) {
        for (var i = array.length; --i >= 0;)
            if (array[i] === name)
                return true;
        return false;
    };

    function HOP(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    };

    var warn = function() {};

    /* -----[ Exports ]----- */

    var init = function(root) {
        if (root.modules["parser"]) {
            return;
        }

        root.parse = parse;

        root.modules["parser"] = true;
    }

    var isCommonJS = (typeof require !== "undefined" && typeof module !== "undefined" && module.exports);
    var isAmd = (typeof define !== "undefined" && define.amd);

    if (isCommonJS) {
        module.exports.init = init;
    } else if (isAmd) {
        define("jscex-parser", function() {
            return {
                init: init
            };
        });
    } else {
        if (typeof Jscex === "undefined") {
            throw new Error('Missing root object, please load "jscex" module first.');
        }

        init(Jscex);
    }

    /*
    scope.tokenizer = tokenizer;
    scope.parse = parse;
    scope.slice = slice;
    scope.curry = curry;
    scope.member = member;
    scope.array_to_hash = array_to_hash;
    scope.PRECEDENCE = PRECEDENCE;
    scope.KEYWORDS_ATOM = KEYWORDS_ATOM;
    scope.RESERVED_WORDS = RESERVED_WORDS;
    scope.KEYWORDS = KEYWORDS;
    scope.ATOMIC_START_TOKEN = ATOMIC_START_TOKEN;
    scope.OPERATORS = OPERATORS;
    scope.is_alphanumeric_char = is_alphanumeric_char;
    scope.set_logger = function (logger) {
        warn = logger;
    };
    */

})();