import {style, Node} from "../src/model"
import {addStyle, removeStyle, insert, insertText, wrap as wrap_,
        join as join_, del as del_, split as split_, lift as lift_,
        replace, setBlockType, applyTransform, invertTransform} from "../src/trans"

import {doc, blockquote, pre, h1, h2, p, li, ol, ul, em, strong, code, a, a2, br, hr} from "./build"

import Failure from "./failure"
import tests from "./tests"
import {cmpNode, cmpStr} from "./cmp"

export function testTransform(doc, expect, steps) {
  let orig = doc.toString(), out = doc, results = [], inverted = []
  for (let i = 0; i < steps.length; i++) {
    let result = applyTransform(out, steps[i])
    if (result) {
      out = result.doc
      results.push(result)
      inverted.push(invertTransform(result, steps[i]))
    }
  }
  cmpNode(out, expect)
  cmpStr(doc, orig, "immutable")
  for (let pos in expect.tag) {
    let val = doc.tag[pos], offset = []
    for (let i = 0; i < results.length; i++)
      ({pos: val, offset: offset[i]} = results[i].map._map(val))
    cmpStr(val, expect.tag[pos], pos)
    for (let i = results.length - 1; i >= 0; i--)
      val = results[i].map._map(val, true, offset[i]).pos
    cmpStr(val, doc.tag[pos], pos + " back")
  }
  for (let i = inverted.length - 1; i >= 0; i--) {
    let result = applyTransform(out, inverted[i])
    out = result.doc
  }
  cmpNode(out, doc, "inverted")
}

function add(name, doc, expect, style) {
  tests["addStyle__" + name] = () => {
    testTransform(doc, expect, addStyle(doc, doc.tag.a, doc.tag.b, style))
  }
}

add("simple",
    doc(p("hello <a>there<b>!")),
    doc(p("hello ", strong("there"), "!")),
    style.strong)
add("double_bold",
    doc(p("hello ", strong("<a>there"), "!<b>")),
    doc(p("hello ", strong("there!"))),
    style.strong)
add("overlap",
    doc(p("one <a>two ", em("three<b> four"))),
    doc(p("one ", strong("two ", em("three")), em(" four"))),
    style.strong)
add("overwrite_link",
    doc(p("this is a ", a("<a>link<b>"))),
    doc(p("this is a ", a2("link"))),
    style.link("http://bar"))
add("code",
    doc(p("before"), blockquote(p("the variable is called <a>i<b>")), p("after")),
    doc(p("before"), blockquote(p("the variable is called ", code("i"))), p("after")),
    style.code)
add("across_blocks",
    doc(p("hi <a>this"), blockquote(p("is")), p("a docu<b>ment"), p("!")),
    doc(p("hi ", em("this")), blockquote(p(em("is"))), p(em("a docu"), "ment"), p("!")),
    style.em)

function rem(name, doc, expect, style) {
  tests["removeStyle__" + name] = () => {
    testTransform(doc, expect, removeStyle(doc, doc.tag.a, doc.tag.b, style))
  }
}

rem("gap",
    doc(p(em("hello <a>world<b>!"))),
    doc(p(em("hello "), "world", em("!"))),
    style.em)
rem("nothing_there",
    doc(p(em("hello"), " <a>world<b>!")),
    doc(p(em("hello"), " <a>world<b>!")),
    style.em)
rem("from_nested",
    doc(p(em("one ", strong("<a>two<b>"), " three"))),
    doc(p(em("one two three"))),
    style.strong)
rem("unlink",
    doc(p("hello ", a("link"))),
    doc(p("hello link")),
    style.link("http://foo"))
rem("other_link",
    doc(p("hello ", a("link"))),
    doc(p("hello ", a("link"))),
    style.link("http://bar"))
rem("across_blocks",
    doc(blockquote(p(em("much <a>em")), p(em("here too"))), p("between", em("...")), p(em("end<b>"))),
    doc(blockquote(p(em("much "), "em"), p("here too")), p("between..."), p("end")),
    style.em)
rem("all",
    doc(p("<a>hello, ", em("this is ", strong("much"), " ", a("markup<b>")))),
    doc(p("<a>hello, this is much markup")),
    null)

function ins(name, doc, expect, nodes) {
  tests["insert__" + name] = () => {
    testTransform(doc, expect, insert(doc.tag.a, nodes))
  }
}

ins("break",
    doc(p("hello<a>there")),
    doc(p("hello", br, "<a>there")),
    new Node.Inline("hard_break"))
ins("simple",
    doc(p("one"), "<a>", p("two<2>")),
    doc(p("one"), p(), "<a>", p("two<2>")),
    new Node("paragraph"))
ins("two",
    doc(p("one"), "<a>", p("two<2>")),
    doc(p("one"), p("hi"), hr, "<a>", p("two<2>")),
    [new Node("paragraph", [new Node.text("hi")]),
     new Node("horizontal_rule")])
ins("end_of_blockquote",
    doc(blockquote(p("he<before>y"), "<a>"), p("after<after>")),
    doc(blockquote(p("he<before>y"), p()), p("after<after>")),
    new Node("paragraph"))
ins("start_of_blockquote",
    doc(blockquote("<a>", p("he<1>y")), p("after<2>")),
    doc(blockquote(p(), "<a>", p("he<1>y")), p("after<2>")),
    new Node("paragraph"))

function del(name, doc, expect) {
  tests["delete__" + name] = () => {
    testTransform(doc, expect, del_(doc, doc.tag.a, doc.tag.b))
  }
}

del("simple",
    doc(p("<1>one"), "<a>", p("tw<2>o"), "<b>", p("<3>three")),
    doc(p("<1>one"), "<a><2>", p("<3>three")))
del("only_child",
    doc(blockquote("<a>", p("hi"), "<b>"), p("x")),
    doc(blockquote(), p("x")))
del("outside_path",
    doc(blockquote(p("a"), "<a>", p("b"), "<b>"), p("c<1>")),
    doc(blockquote(p("a")), p("c<1>")))

function txt(name, doc, expect, text) {
  tests["insertText__" + name] = () => {
    testTransform(doc, expect, insertText(doc, doc.tag.a, text))
  }
}

txt("inherit_style",
    doc(p(em("he<a>lo"))),
    doc(p(em("hello"))),
    "l")
txt("simple",
    doc(p("hello<a>")),
    doc(p("hello world<a>")),
    " world")
txt("simple_inside",
    doc(p("he<a>llo")),
    doc(p("hej<a>llo")),
     "j")
txt("left_associative",
    doc(p(em("hello<a>"), " world<after>")),
    doc(p(em("hello big"), " world<after>")),
    " big")
txt("paths",
    doc(p("<1>before"), p("<2>here<a>"), p("after<3>")),
    doc(p("<1>before"), p("<2>here!<a>"), p("after<3>")),
    "!")
txt("at_start",
    doc(p("<a>one")),
    doc(p("two <a>one")),
    "two ")
txt("after br",
    doc(p("hello", br, "<a>you")),
    doc(p("hello", br, "...you")),
    "...")
txt("after_br_nojoin",
    doc(p("hello", br, em("<a>you"))),
    doc(p("hello", br, "...<a>", em("you"))),
    "...")
txt("before_br",
    doc(p("<a>", br, "ok")),
    doc(p("ay", br, "ok")),
    "ay")

function join(name, doc, expect) {
  tests["join__" + name] = () => {
    testTransform(doc, expect, join_(doc, doc.tag.a))
  }
}

join("simple",
     doc(blockquote(p("<before>a")), "<a>", blockquote(p("b")), p("after<after>")),
     doc(blockquote(p("<before>a"), "<a>", p("b")), p("after<after>")))
join("deeper",
     doc(blockquote(blockquote(p("a"), p("b<before>")), "<a>", blockquote(p("c"), p("d<after>")))),
     doc(blockquote(blockquote(p("a"), p("b<before>"), "<a>", p("c"), p("d<after>")))))
join("lists",
     doc(ol(li(p("one")), li(p("two"))), "<a>", ol(li(p("three")))),
     doc(ol(li(p("one")), li(p("two")), "<a>", li(p("three")))))
join("list_item",
     doc(ol(li(p("one")), li(p("two")), "<a>", li(p("three")))),
     doc(ol(li(p("one")), li(p("two"), "<a>", p("three")))))
join("inline",
     doc(p("foo"), "<a>", p("bar")),
     doc(p("foo<a>bar")))

function split(name, doc, expect, args) {
  tests["split__" + name] = () => {
    testTransform(doc, expect, split_(doc.tag.a, args && args.depth, args && args.node))
  }
}

split("simple",
      doc(p("foo<a>bar")),
      doc(p("foo"), p("<a>bar")))
split("before_and_after",
      doc(p("<1>a"), p("<2>foo<a>bar<3>"), p("<4>b")),
      doc(p("<1>a"), p("<2>foo"), p("<a>bar<3>"), p("<4>b")))
split("deeper",
      doc(blockquote(blockquote(p("foo<a>bar"))), p("after<1>")),
      doc(blockquote(blockquote(p("foo")), blockquote(p("<a>bar"))), p("after<1>")),
      {depth: 2})
split("and_deeper",
      doc(blockquote(blockquote(p("foo<a>bar"))), p("after<1>")),
      doc(blockquote(blockquote(p("foo"))), blockquote(blockquote(p("<a>bar"))), p("after<1>")),
      {depth: 3})
split("at_end",
      doc(blockquote(p("hi<a>"))),
      doc(blockquote(p("hi"), p("<a>"))))
split("at_start",
      doc(blockquote(p("<a>hi"))),
      doc(blockquote(p(), p("<a>hi"))))
split("list_paragraph",
      doc(ol(li(p("one<1>")), li(p("two<a>three")), li(p("four<2>")))),
      doc(ol(li(p("one<1>")), li(p("two"), p("<a>three")), li(p("four<2>")))))
split("list_item",
      doc(ol(li(p("one<1>")), li(p("two<a>three")), li(p("four<2>")))),
      doc(ol(li(p("one<1>")), li(p("two")), li(p("<a>three")), li(p("four<2>")))),
      {depth: 2})
split("change_type",
      doc(h1("hell<a>o!")),
      doc(h1("hell"), p("<a>o!")),
      {node: new Node("paragraph")})

function lift(name, doc, expect) {
  tests["lift__" + name] = () => {
    testTransform(doc, expect, lift_(doc, doc.tag.a, doc.tag.b))
  }
}

lift("simple_between",
     doc(blockquote(p("<before>one"), p("<a>two"), p("<after>three"))),
     doc(blockquote(p("<before>one")), p("<a>two"), blockquote(p("<after>three"))))
lift("simple_at_front",
     doc(blockquote(p("<a>two"), p("<after>three"))),
     doc(p("<a>two"), blockquote(p("<after>three"))))
lift("simple_at_end",
     doc(blockquote(p("<before>one"), p("<a>two"))),
     doc(blockquote(p("<before>one")), p("<a>two")))
lift("simple_alone",
     doc(blockquote(p("<a>t<in>wo"))),
     doc(p("<a>t<in>wo")))
lift("multiple",
     doc(blockquote(blockquote(p("on<a>e"), p("tw<b>o")), p("three"))),
     doc(blockquote(p("on<a>e"), p("tw<b>o"), p("three"))))
lift("multiple_lopsided",
     doc(p("start"), blockquote(blockquote(p("a"), p("<a>b")), p("<b>c"))),
     doc(p("start"), blockquote(p("a"), p("<a>b")), p("<b>c")))
lift("deeper",
     doc(blockquote(blockquote(p("<1>one"), p("<a>two"), p("<3>three"), p("<b>four"), p("<5>five")))),
     doc(blockquote(blockquote(p("<1>one")), p("<a>two"), p("<3>three"), p("<b>four"), blockquote(p("<5>five")))))
lift("from_list",
     doc(ul(li(p("one")), li(p("two<a>")), li(p("three")))),
     doc(ul(li(p("one"))), p("two<a>"), ul(li(p("three")))))
lift("multiple_from_list",
     doc(ul("<1>", li(p("one<a>")), li(p("two<b>")), li(p("three<after>")))),
     doc("<1>", p("one<a>"), p("two<b>"), ul(li(p("three<after>")))))
lift("end_of_list",
     doc(ul(li(p("a")), li(p("b<a>")), "<1>")),
     doc(ul(li(p("a"))), p("b<a>"), "<1>"))
lift("multiple_from_list_with_two_items",
     doc(ul(li(p("one<a>"), p("<half>half")), li(p("two<b>")), li(p("three<after>")))),
     doc(p("one<a>"), p("<half>half"), p("two<b>"), ul(li(p("three<after>")))))

function wrap(name, doc, expect, node) {
  tests["wrap__" + name] = () => {
    testTransform(doc, expect, wrap_(doc, doc.tag.a, doc.tag.b, node))
  }
}

wrap("simple",
     doc(p("one"), p("<a>two"), p("three")),
     doc(p("one"), blockquote(p("<a>two")), p("three")),
     new Node("blockquote"))
wrap("two",
     doc(p("one<1>"), p("<a>two"), p("<b>three"), p("four<4>")),
     doc(p("one<1>"), blockquote(p("<a>two"), p("three")), p("four<4>")),
     new Node("blockquote"))
wrap("list",
     doc(p("<a>one"), p("<b>two")),
     doc(ol(li(p("<a>one")), li(p("<b>two")))),
     new Node("ordered_list"))
wrap("nested_list",
     doc(ol(li(p("<1>one")), li(p("<a>two"), p("<b>three")), li(p("<4>four")))),
     doc(ol(li(p("<1>one")), li(ol(li(p("<a>two")), li(p("<b>three")))), li(p("<4>four")))),
     new Node("ordered_list"))
wrap("not_possible",
     doc(p("hi<a>")),
     doc(p("hi<a>")),
     new Node("horizontal_rule"))
wrap("include_parent",
     doc(blockquote(p("<1>one"), p("two<a>")), p("three<b>")),
     doc(blockquote(blockquote(p("<1>one"), p("two<a>")), p("three<b>"))),
     new Node("blockquote"))
wrap("bullet_list",
     doc(p("x"), p("yyyy<a>y"), p("z")),
     doc(p("x"), ul(li(p("yyyy<a>y"))), p("z")),
     new Node("bullet_list"))

function type(name, doc, expect, node) {
  tests["setType__" + name] = () => {
    testTransform(doc, expect, setBlockType(doc, doc.tag.a, doc.tag.b, node))
  }
}

type("simple",
     doc(p("am<a> i")),
     doc(h2("am i")),
     new Node("heading", null, {level: 2}))
type("multiple",
     doc(h1("<a>hello"), p("there"), p("<b>you"), p("end")),
     doc(pre("hello"), pre("there"), pre("you"), p("end")),
     new Node("code_block"))
type("inside",
     doc(blockquote(p("one<a>"), p("two<b>"))),
     doc(blockquote(h1("one<a>"), h1("two<b>"))),
     new Node("heading", null, {level: 1}))
type("clear_markup",
     doc(p("hello<a> ", em("world"))),
     doc(pre("hello world")),
     new Node("code_block"))
type("only_clear_for_code_block",
     doc(p("hello<a> ", em("world"))),
     doc(h1("hello<a> ", em("world"))),
     new Node("heading", null, {level: 1}))

function repl(name, doc, source, expect) {
  tests["replace__" + name] = () => {
    testTransform(doc, expect, replace(doc, doc.tag.a, doc.tag.b || doc.tag.a,
                                       source, source && source.tag.a, source && source.tag.b))
  }
}

repl("add_text",
     doc(p("hell<a>o y<b>ou")),
     doc(p("<a>i k<b>")),
     doc(p("helli k<a><b>ou")))
