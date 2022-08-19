# Logic Editor - code explanation

**Version 0.9**

**Author: Casper Storm Hansen**

The Logic Editor web app lets user create natural deduction proofs as taught in, e.g., introductory logic courses in philosophy undergraduate programs.

This document explains the Logic Editor code, presupposing understanding of the app from a user’s perspective (which again presupposes basic knowledge of natural deduction proofs in formal logic).

Section 1 covers proofs: their internal representation and how they are rendered. Section 2 deals with addition of premises and assumptions. Section 3 is concerned with applications of inference rules. Section 4 explains the remaining code, for example that concerning initialization and resetting. Section 5 concerns the backend and the part of the frontend that connects to it. Section 6 contains the version history. And a final section lists planned updates.

## 1 Proofs

The syntactical structure of a formula is tree-shaped. A formula is internally represented by a dictionary, e.g., of the form `{type: ‘conjunction’, left: …, right: …}`, where the dots can have the same form – iterated to any level of complexity. The types `disjunction`, `conditional`, and `biconditional` are similar to the case of conjunction. The type `negation` has no `left` key. The type `atomic` has neither a `left` nor a `right` key, but instead a `letter` key, the value of which is the propositional letter or the contradiction symbol. The final type is `empty`, which is used when a formula is in the process of being entered by the user. Dictionaries with type `atomic` or `empty` constitute the leaves of the formula tree structure, while the rest constitute its internal nodes.

The `string` function converts such a tree structure to html containing the formula in the usual linear form by recursively calling itself. To be precise, it calls itself via the `stringPar` function which adds parenthesis when appropriate. Both functions take an optional `id` argument, the presence of which indicates that the formula is being edited, in which case sub-formulas are wrapped in `<span>`s that are clickable and equipped with `id`s (see section 2 for more details).

The `proof` object is a list of objects that correspond to the lines of the proof, except the first item which is `null` to ensure that the list is, in effect, one-indexed. Each “line” is a dictionary containing

- a formula
- `dependencies`: a list of the lower-numbered lines it depends on
- `inference`: whether the line is a premise, an assumption, or what inference rule it was produced with
- `inferenceSources`: the lines it was inferred from, if any
- `beingEdited`: a Boolean (may be absent, which represents false)

The function `renderProof` converts the internal `proof` object to html which is then placed in a designated `<div>`. Each update of the proof, as shown to the user, happens by a complete replacement of the content of this `<div>`. The `renderProof` function calls the above-mentioned `string` function, as well as three other functions, which are described below.

## 2 Addition of premises and assumptions

When the user clicks one of the buttons "Add premise" or "Add assumption," the function `addPremiseOrAssumption` is called. 

First, it calls `cancel`, the same function that is directly called by the "Cancel" button. This function has the effect of deleting any progress towards adding another premise or assumption or applying an inference rule, in case the user is in the process of doing so.

Second, it adds an "empty line" to `proof`, and calls `renderProof`, which will assign `id`s to the new formula and (later, when it is modified by the user to become a complex formula) its sub-formulas.

Third, it calls the function `makeActive`; fourth, it changes which buttons are active (using the `buttonsActive` function); and fifth, it changes the contextual help shown to the user (using the `help` function). In this case, `makeActive` adds the `.active` class to the new formula's DOM element, lets the variable `activeElement` be equal to that element, and lets the variable `activeFormula` be equal to its `id`. This ensures that the empty formula is highlighted, so the user can see where further input will go, and that further input actually goes there when the user clicks a button for a propositional letter or connective.

Such input is handled by the `insert` function. It first identifies the object in the `proof` tree that should be modified and lets `obj` refer to the object *one step above* it. It does so by relying on the `id`, which has a structure that reflects the path down in the tree to the desired object. For example, the `id` might be "3.formula.left.left.right". The variable `array` is initially set equal to the list that results from splitting this string at ".", and then these elements are removed, starting from the beginning, as the `obj` is progressively redefined to objects deeper and deeper in the tree. This happens in the first few lines of `insert`'s code. When the `switch` is reached, the array has one element left, so in the example it would be equal to `['right']`. In each of the three `case`s under the `switch`, `obj['right']` would then be set equal to the desired sub-formula. This ensures that `proof` is modified, and not just `obj`.

The `insert` function is also called in the process of applying one of the inference rules. This is tested by the condition `ruleSelections[0] === null` as several points in `insert`. In this section, I am only describing what happens when that is true.

In that case, `renderProof` is called. Then, the rest of the code is concerned with passing the "active" status to a suitable new sub-formula. When a connective is inserted, this is simple: such status is passed to (one of) the new empty sub-formulas that are created. When a propositional letter is inserted instead, it is more complicated. First, `listOfEmpty` is defined as a list that contains all remaining empty sub-formulas's DOM elements plus that of one more (making the variable name slightly misleading): the sub-formula that was just filled out. This is included so the code can subsequently search for the list for the first element that comes after this one (with the first element of the list being considered to come after the last one), and make that one active. If no empty sub-formulas remain, the process of adding a new premise or assumption has been completed, and various variables and buttons are updated to reflect this.

The `makeActive` formula is also called when the user clicks on a different sub-formula's DOM element instead of inputting something to the currently active one. The user is allowed to activate a sub-formula that has already been inputted (so s/he can change his/her mind). This creates a small complication. Consider, for example the sub-formula "P ∧ Q". "P" is both its own sub-formula and a part of the larger sub-formula. That creates an ambiguity when "P" is clicked. This is resolved by only letting a click on "∧" count as an activation of "P ∧ Q". That is, a click on a DOM child is supposed to activate its parent. For this reason, `makeActive` takes a second argument that indicates exactly what, in relation to the clicked element, should be activated.

## 3 Application of inference rules

When the user clicks one of the inference rule buttons, the function `ruleSelection` is called. It stores the choice of rule as the first element of the six-element list `ruleSelections` (notice: plural). By default, this list contains six `null`s, which are progressively filled up as the user makes choices concerning rule application. With a few exceptions, to be covered below, the remaining choices will consist in line numbers from the existing proof. All but disjunction-elimination will require fewer than five choices and thus leave some of the `null`s in place.

The function `ruleSelection` then calls `renderAll` and then modifies which buttons are active.

The function `renderAll` simply calls `renderProof` and then `renderRule`. The former was partially explained above, but it is now relevant to mention that it calls `testEligibilityOfLine`. This function returns a Boolean for each line of the proof indicating whether, given the value of `ruleSelections`, the line is eligible as the user's next choice. For example, if conditional-elimination has been chosen, the next choice must be a line with a conditional.

There is one special case here. If the rule in question is conjunction-elimination, the user must choose not a line in the proof, but a conjunct in one of those lines. In this case, `renderProof` calls `stringSelectableConjuncts` instead of `string`and two entries in `ruleSelections` are utilized to provides information about both the line number and whether the left or right conjunct has been selected.

The modification of `ruleSelections` (in this and the other cases) is done by the function `lineSelection`. When it has done that (and perhaps changed which buttons are active), it calls `ruleVariableUpdate`. 

This function, which accounts for a significant part of the JavaScript code, is responsible for changing the values of several variables that correspond to the variables in a textbook statement of the inference rules. They are as follows:

- `p`, `q`, `r`: variables of formulas
- `g`, `h`, `i`, `j`, `k`, `m`: variables for line numbers
- `a`, `b`, `c`: variables for list of dependencies

By default, the values are such that when they are rendered, they show exactly what a textbook would contain. For example, `p` renders as "p". (These and other defaults are set and reset by the function `resetRuleVariablesAndSelections`.) However, when the user has made choices that determine their value, `ruleVariableUpdate` makes those updates. In those cases where the user has to make more decisions before the rule can be applied, the function then calls `renderAll`.

As mentioned, `renderAll` calls `renderProof`, which has been fully explained above, and `renderRule`, which it is now time to describe. The last half of that function creates html code and sends it to the appropriate place in the DOM. It calls the function `waitingForInput`, which returns a Boolean indicating whether a given line in the rule should be highlighted to indicate that it is the next concerning which the user must make a choice. It also relies on the object stored in `rule` to supply the variable information. This object is a list of lists, which is created in the first half of `renderRule`.  It contains one list for each line in the rule, plus a first element that contains the name of the rule as presented to the user. Each inner list contains one element for each table cell to be outputted. Basically, the first half of `renderRule` tells the last half how the variables that were assigned values by `ruleVariableUpdate` should be organized for output.

When the user has made all the choices needed to apply a rule, `ruleVariableUpdate` does something else. It first updates relevant variables and, second, calls `renderProof` to remove highlighting of previously eligible lines. Third, it adds the new "line" to `proof`. Both here and in `renderRule`, the five functions, `negationOf`, …, `biconditionalOf`are called to create complex formulas from less complex ones. The variable `theContradiction` may also be called to supply the atomic formula consisting of just the contradiction symbol. Fourth, it calls `finishRuleApplication`, which is responsible for the visual effect consisting in most of the rendered rule fading out and the new line sliding up to join the proof. This part of the code utilizes jQuery.

Preparation for this effect has been made by `renderRule` having split its html in two and ship it to different `<div>`s. The first vanish, while the second contains the new line and stays visible. Thus, immediately after the conclusion of the visual effect, the html table contains a first `<div>` with all but one line of the proof, a collapsed second  `<div>`, and a third  `<div>` containing the new line of the proof. Then, invisibly to the user, the full proof is placed in the first one, while the second and third one are emptied of content, and the second one is made "visible" again, so that the two latter  `<div>`s are ready for the application of a new rule.

Also, while the animation takes place, all but the "reset" button are deactivated, as the code is not able to handle input correctly at that point. Afterwards, some of the buttons are made active again, and `resetRuleVariablesAndSelections` is called. 

A special case must be mentioned, namely disjunction-introduction, which needs the user to enter a sub-formula. The function `ruleVariableUpdate` therefore calls the above-mentioned `makeActive` function in that case and `insert` calls `ruleVariableUpdate` with the special argument values `callFromInsertUnfinished` and `callFromInsertFinished`. While being inputted, the sub-formula is stored in `enteredDisjunct`. 

## 4 Odds and ends

When the user is finished, a button can be clicked to show the proved sequent. This is accomplished by the function `finishProof`. The function `finishReady` checks whether the proof can be finished, i.e., whether the proofs final line depends on only premises. This function is called by various other functions to determine whether the button should be active and whether the help info should mention the option of using it.

The "reset" button can be clicked at any time to reset the app to its initial state. This is of course handled by the `reset` function. It does approximately the same as what happens when the app is loaded (the last few lines of the code). However, at initialization buttons are also created using the `createButton` function and an example proof is shown. In addition, at this point the dictionary `symbols` is defined.

When buttons are created, they are assigned an appropriate function to call on click. Some of them are also assigned a function that is called when the mouse enters its area, and another when it leaves. The former highlights what will be deleted if the button is pressed and the latter undoes that highlighting. This is accomplished by the six functions named variations of "showDeleteCandidates" and the auxiliary functions `addRed` and `removeRed`.  And for this purpose, the classes `finalLine` and `ruleLine` are added to some table rows by the `renderProof` and `renderRule` functions.

The highlighting effect is only activated if the mouse stays over the button in question for more than 100 milliseconds - to avoid annoying "blinking" when the user unintentionally passes over the button. It is not activated at all when the example proof is shown, since the user should not be discouraged to delete that. This is avoided because `addRed` checks the value of the variable `justLoaded`, which is initially true, and changed to false on the first call to `reset`.

The `openSettings` function does what the name suggests. In the settings menu, the user can change symbols used for the connectives and the list of available propositional letters. This behavior is governed by the event listeners placed immediately after the definition of the `openSettings` function in the code.

## 5 Backend

When the proof is finished, the function `contactServer` is called, which sends the `proof` to the backend. The backend, which is written in Python, searches a database to find out if the sequent in question has been previously proved in the app. Or, to be more precise, it checks if the sequent *or an essentially identical sequent* has. Two sequents are considered to be essentially identical if one can be be the result of permutating the premises and/or renaming the propositional letters or the other. The search is conducted by first picking a canonical representative of the equivalence class induced by the mentioned equivalence relation that the sequent belongs to, and then searching for *that* in the database. This, again, is done by creating a list of all permutations of the premises, and for each corresponding sequent replacing the propositional letters with numbers according to the order in which they first appear.

If the sequent is not already in the database, the sequent and the user's proof are added to it and a message is passed back to the frontend and shown in the contextual help window. This is handled by `sendDataCallback`. If the sequent already *is* in the database, both a message and the saved proof is sent. The message gives the user the option to see that proof in order to compare it to their own. The function `renderOldProof` does that. In this case, the message informs th user whether their proof was longer than, the same length as, or shorter than the previously shortest proof. If it was shorter, the old proof in the database is replaced by the user's. 

## 6 Version history

v0.1: Initial version

v0.2: Contextual help added; example proof shown at page load; minor tweak to how buttons (de)activate

v0.3: Visual design improved

v0.4: Option to delete last line added; visual warnings added for all buttons that delete something; buttons reorganised according to whether they trigger high-level or low-level actions

v0.5: Changes to the inference rules; minor tweak to button design

v0.6: Settings menu added

v0.7: Functionality for finishing the proof is added; favicon added

v0.8: Final visual design implemented

v0.9: Backend added

## 7 Planned updates

The app will be updated with the following:
- the backend will be connected to a stable database
- extension to predicate logic