const string = (formula, id = '') => {
    if (id) {
        switch (formula.type) {
            case 'empty':
                return `<span class=empty id=${id} onclick=makeActive(this,"justThis")>${formula.letter}</span>`;
            case 'atomic':
                return `<span id=${id} onclick=makeActive(this,"justThis")>${formula.letter}</span>`;
            case 'contradiction':
                return `<span id=${id} onclick=makeActive(this,"justThis")>${symbols.contradiction}</span>`;
            case 'negation':
                return `<span id=${id}><span onclick=makeActive(this,"parentNode")>${symbols.negation}</span>&thinsp;${stringPar(formula.right, id + '.right')}</span>`;
            default:
                return `<span id=${id}>${stringPar(formula.left, id + '.left')}<span onclick=makeActive(this,"parentNode")>&emsp13;${symbols[formula.type]}&emsp13;</span>${stringPar(formula.right, id + '.right')}</span>`;
        }
    } else {
        switch (formula.type) {
            case 'atomic':
                return formula.letter;
            case 'contradiction':
                return symbols.contradiction;
            case 'negation':
                return `${symbols.negation}&thinsp;${stringPar(formula.right)}`;
            default:
                return `${stringPar(formula.left)}&emsp13;${symbols[formula.type]}&emsp13;${stringPar(formula.right)}`;
        }
    }
}

const stringSelectableConjuncts = (formula, line) => {
    return `<span class="selectable" onclick="lineSelection(${line}, 'left')">${stringPar(formula.left)}</span>
        &emsp13;${symbols['conjunction']}&emsp13;
        <span class="selectable" onclick="lineSelection(${line}, 'right')">${stringPar(formula.right)}</span>`;
}

const stringPar = (formula, id = '') => {
    if (['conjunction', 'disjunction', 'conditional', 'biconditional'].includes(formula.type)) {
        return '(' + string(formula, id) + ')';
    } else {
        return string(formula, id);
    }
}

const renderProof = () => {
    let rows = '';
    let anyEligibleLines = false;
    for (let i = 1; i < proof.length; i++) {
        rows += '<div class="tableRow';
        if (i + 1 === proof.length) {
            rows += ' finalLine';
        }
        if (testEligibilityOfLine(i)) {
            rows += ` selectable" onclick="lineSelection(${i})">`;
            anyEligibleLines = true;
        } else {
            rows += '">';
        }
        rows += `<div class="tableCell">${String(proof[i]['dependencies'])}</div>
            <div class="tableCell">(${i})</div>`;
        if (testEligibilityOfLine(i, 'conjuncts')) {
            rows += `<div class="tableCell">${stringSelectableConjuncts(proof[i]['formula'], i)}</div>`;
            anyEligibleLines = true;
        } else if (proof[i]['beingEdited']) {
            rows += `<div class="tableCell">${string(proof[i]['formula'], i + '.formula')}</div>`;
        } else {
            rows += `<div class="tableCell">${string(proof[i]['formula'])}</div>`;
        }
        rows += `<div class="tableCell">${proof[i]['inferenceSources']} ${proof[i]['inference']}</div>
            </div>`;
    }
    $("#proof").html(rows);
    if (ruleSelections[0] !== null) {
        if (ruleSelections[1] === null) {
            if (ruleSelections[0] !== `conjunctionE`) {
                if (anyEligibleLines) {
                    help('inference-first');
                } else {
                    help('inference-first-fail');
                }
            } else {
                if (anyEligibleLines) {
                    help('conelim');
                } else {
                    help('conelim-fail');
                }
            }
        } else {
            if (anyEligibleLines) {
                help('inference-next');
            } else {
                help('inference-next-fail');
            }
        }
    }
}

const addPremiseOrAssumption = (premiseOrAssumption) => {
    cancel();
    proof.push(
        {
            formula: { type: 'empty', letter: '_' },
            dependencies: [proof.length],
            inference: premiseOrAssumption,
            inferenceSources: [],
            beingEdited: true
        }
    )
    renderProof();
    makeActive(document.getElementById(`${proof.length - 1}.formula`), 'justThis');
    buttonsActive({
        symbolInput: true,
        cancel: true,
        reset: true,
        settings: false,
        finish: false
    }, {
        [(premiseOrAssumption === "Premise") ? 'Addpremise' : 'Addassumption']: false
    })
    help((proof.length === 2) ?
        (premiseOrAssumption === "Premise") ?
            'premise-first-nolines'
            :
            'assumption-first-nolines'
        :
        (premiseOrAssumption === "Premise") ?
            'premise-first-existinglines'
            :
            'assumption-first-existinglines'
    );
}

const makeActive = (clickedOrInsertedElement, thisOrParentOrChild) => {
    if (activeElement) {
        activeElement.classList.remove('active');
    }
    switch (thisOrParentOrChild) {
        case "justThis":
            activeElement = clickedOrInsertedElement;
            break;
        default:
            activeElement = clickedOrInsertedElement[thisOrParentOrChild];
            break;
    }
    activeElement.classList.add('active');
    activeFormula = activeElement.id;
}

const insert = (type, symbol = '') => {
    if (activeFormula) {
        buttonsActive({
            premiseOrAssumption: false,
            inference: false
        })
        let array = activeFormula.split(".");
        let obj = (ruleSelections[0] === null) ? proof : enteredDisjunct;
        while (array.length > 1) {
            obj = obj[array.shift()];
        }
        switch (type) {
            case 'atomic':
            case 'contradiction':
                if (type === 'atomic') {
                    obj[array.shift()] = { type: 'atomic', letter: symbol };
                } else {
                    obj[array.shift()] = { type: 'contradiction' };
                }
                if (ruleSelections[0] === null) {
                    renderProof();
                    help('premiseorassumption-next');
                } else {
                    ruleVariableUpdate(null, 'callFromInsertUnfinished');
                    renderRule();
                }
                listOfEmpty = document.querySelectorAll(`.empty, [id="${activeFormula}"]`)
                if (listOfEmpty.length === 1) {
                    if (ruleSelections[0] === null) {
                        proof[activeFormula.split(".")[0]]['beingEdited'] = false;
                        activeElement = undefined;
                        activeFormula = undefined;
                        buttonsActive({
                            premiseOrAssumption: true,
                            symbolInput: false,
                            inference: true,
                            settings: true,
                            finish: finishReady()
                        });
                        help('noactiveinput-existinglines');
                    } else {
                        activeElement = undefined;
                        activeFormula = undefined;
                        ruleVariableUpdate(null, 'callFromInsertFinished');
                    }
                } else {
                    for (let i = 0; i < listOfEmpty.length; i++) {
                        if (listOfEmpty.item(i).id === activeFormula) {
                            if (i + 1 < listOfEmpty.length) {
                                makeActive(listOfEmpty.item(i + 1), 'justThis');
                            } else {
                                makeActive(listOfEmpty.item(0), 'justThis');
                            }
                            break;
                        }
                    }
                }
                break;
            case 'negation':
                obj[array.shift()] = { type: 'negation', right: { type: 'empty', letter: '_' } };
                if (ruleSelections[0] === null) {
                    renderProof();
                    help('premiseorassumption-next');
                } else {
                    ruleVariableUpdate(null, 'callFromInsertUnfinished');
                    renderRule();
                }
                makeActive(document.getElementById(activeFormula), 'lastChild');
                break;
            default:
                obj[array.shift()] = { type: type, left: { type: 'empty', letter: '_' }, right: { type: 'empty', letter: '_' } };
                if (ruleSelections[0] === null) {
                    renderProof();
                    help('premiseorassumption-next');
                } else {
                    ruleVariableUpdate(null, 'callFromInsertUnfinished');
                    renderRule();
                }
                makeActive(document.getElementById(activeFormula), 'firstChild');
                break;
        }
    }
}

const ruleSelection = (rule) => {
    cancel();
    ruleSelections = [rule, null, null, null, null, null];
    renderAll();
    buttonsActive({
        cancel: true,
        premiseOrAssumption: true,
        symbolInput: false,
        inference: true,
        settings: false,
        finish: false
    }, {
        [rule]: false
    });
}

const testEligibilityOfLine = (proofLine, conjuncts = '') => {
    if (conjuncts === 'conjuncts') {
        if (ruleSelections[0] === `conjunctionE`) {
            if (ruleSelections[1] === null) {
                return proof[proofLine]['formula']['type'] === 'conjunction';
            }
        }
    } else {
        switch (ruleSelections[0]) {
            case null: {
                return false;
            }
            case `negationE`: {
                if (ruleSelections[1] === null) {
                    return proof[proofLine]['formula']['type'] === 'negation';
                } else if (ruleSelections[2] === null) {
                    return JSON.stringify(proof[proofLine]['formula']) === JSON.stringify(proof[ruleSelections[1]]['formula']['right']);
                }
            }
            case `negationI`: {
                if (ruleSelections[1] === null) {
                    return proof[proofLine]['inference'] === 'Assumption';
                } else if (ruleSelections[2] === null) {
                    return JSON.stringify(proof[proofLine]['formula']) === JSON.stringify(theContradiction);
                }
            }
            case `conjunctionE`: {
                return false;
            }
            case `conjunctionI`: {
                if (ruleSelections[2] === null) {
                    return true;
                } else {
                    return false;
                }
            }
            case `disjunctionI`: {
                if (ruleSelections[1] === null) {
                    return true;
                } else {
                    return false;
                }
            }
            case `disjunctionE`: {
                if (ruleSelections[1] === null) {
                    return proof[proofLine]['formula']['type'] === 'disjunction';
                } else if (ruleSelections[2] === null) {
                    return JSON.stringify(proof[proofLine]['formula']) === JSON.stringify(proof[ruleSelections[1]]['formula']['left']);
                } else if (ruleSelections[3] === null) {
                    return true;
                } else if (ruleSelections[4] === null) {
                    return JSON.stringify(proof[proofLine]['formula']) === JSON.stringify(proof[ruleSelections[1]]['formula']['right']);
                } else if (ruleSelections[5] === null) {
                    return JSON.stringify(proof[proofLine]['formula']) === JSON.stringify(proof[ruleSelections[3]]['formula']);
                }
            }
            case `conditionalE`: {
                if (ruleSelections[1] === null) {
                    return proof[proofLine]['formula']['type'] === 'conditional';
                } else if (ruleSelections[2] === null) {
                    return JSON.stringify(proof[proofLine]['formula']) === JSON.stringify(proof[ruleSelections[1]]['formula']['left']);
                }
            }
            case `conditionalI`: {
                if (ruleSelections[1] === null) {
                    return proof[proofLine]['inference'] === 'Assumption';
                } else if (ruleSelections[2] === null) {
                    return true;
                }
            }
            case 'Df': {
                if (ruleSelections[1] === null) {
                    return proof[proofLine]['formula']['type'] === 'biconditional'
                        ||
                        (proof[proofLine]['formula']['type'] === 'conjunction'
                            && proof[proofLine]['formula']['left']['type'] === 'conditional'
                            && proof[proofLine]['formula']['right']['type'] === 'conditional'
                            && JSON.stringify(proof[proofLine]['formula']['left']['left'])
                            === JSON.stringify(proof[proofLine]['formula']['right']['right'])
                            && JSON.stringify(proof[proofLine]['formula']['left']['right'])
                            === JSON.stringify(proof[proofLine]['formula']['right']['left']));
                }
            }
            case 'DN': {
                if (ruleSelections[1] === null) {
                    return proof[proofLine]['formula']['type'] === 'negation'
                        && proof[proofLine]['formula']['right']['type'] === 'negation';
                }
            }
        }
    }
}

const lineSelection = (proofLine, conjunct = null) => {
    let ruleLine = ruleSelections.findIndex(ruleLine => ruleLine === null);
    ruleSelections[ruleLine] = proofLine;
    if (conjunct) {
        ruleSelections[ruleLine + 1] = conjunct;
    }
    buttonsActive({
        premiseOrAssumption: false,
        inference: false
    });
    ruleVariableUpdate(proofLine, ruleLine);
}

const ruleVariableUpdate = (proofLine, ruleLine) => {
    switch (ruleSelections[0]) {
        case `negationE`: {
            switch (ruleLine) {
                case 1: {
                    j = proofLine;
                    a = proof[proofLine]['dependencies'];
                    q = proof[proofLine]['formula']['right'];
                    renderAll();
                    break;
                }
                case 2: {
                    k = proofLine;
                    b = proof[proofLine]['dependencies'];
                    m = proof.length;
                    renderProof();
                    proof.push(
                        {
                            formula: theContradiction,
                            dependencies: [...Array(proof.length + 1).keys()].filter(i => proof[ruleSelections[1]]['dependencies'].includes(i) || proof[ruleSelections[2]]['dependencies'].includes(i)),
                            inference: rule[0],
                            inferenceSources: [ruleSelections[1], ruleSelections[2]]
                        }
                    );
                    finishRuleApplication();
                    break;
                }
            }
            break;
        }
        case `negationI`: {
            switch (ruleLine) {
                case 1: {
                    j = proofLine;
                    p = proof[proofLine]['formula'];
                    renderAll();
                    break;
                }
                case 2: {
                    k = proofLine;
                    a = proof[proofLine]['dependencies'];
                    m = proof.length;
                    renderProof();
                    proof.push(
                        {
                            formula: negationOf(proof[ruleSelections[1]]['formula']),
                            dependencies: [...Array(proof.length + 1).keys()].filter(i => proof[ruleSelections[2]]['dependencies'].includes(i) && i !== ruleSelections[1]),
                            inference: rule[0],
                            inferenceSources: [ruleSelections[1], ruleSelections[2]]
                        }
                    );
                    finishRuleApplication();
                    break;
                }
            }
            break;
        }
        case `conjunctionE`: {
            switch (ruleLine) {
                case 1: {
                    j = proofLine;
                    a = proof[proofLine]['dependencies'];
                    p = proof[proofLine]['formula']['left'];
                    q = proof[proofLine]['formula']['right'];
                    k = proof.length;
                    renderProof();
                    proof.push(
                        {
                            formula: proof[ruleSelections[1]]['formula'][ruleSelections[2]],
                            dependencies: proof[ruleSelections[1]]['dependencies'],
                            inference: rule[0],
                            inferenceSources: [ruleSelections[1]]
                        }
                    );
                    finishRuleApplication();
                    break;
                }
            }
            break;
        }
        case `conjunctionI`: {
            switch (ruleLine) {
                case 1: {
                    j = proofLine;
                    a = proof[proofLine]['dependencies'];
                    p = proof[proofLine]['formula'];
                    renderAll();
                    break;
                }
                case 2: {
                    k = proofLine;
                    b = proof[proofLine]['dependencies'];
                    q = proof[proofLine]['formula'];
                    m = proof.length;
                    renderProof();
                    proof.push(
                        {
                            formula: conjunctionOf(proof[ruleSelections[1]]['formula'], proof[ruleSelections[2]]['formula']),
                            dependencies: [...Array(proof.length + 1).keys()].filter(i => proof[ruleSelections[1]]['dependencies'].includes(i) || proof[ruleSelections[2]]['dependencies'].includes(i)),
                            inference: rule[0],
                            inferenceSources: [ruleSelections[1], ruleSelections[2]]
                        }
                    );
                    finishRuleApplication();
                    break;
                }
            }
            break;
        }
        case `disjunctionI`: {
            switch (ruleLine) {
                case 1: {
                    j = proofLine;
                    a = proof[proofLine]['dependencies'];
                    p = proof[proofLine]['formula'];
                    renderAll();
                    help('disintro-pick');
                    break;
                }
                case 2: {
                    q = enteredDisjunct['formula'];
                    buttonsActive({
                        symbolInput: true
                    });
                    renderAll();
                    makeActive(document.getElementById('formula'), 'justThis');
                    help('disintro-first');
                    break;
                }
                case 'callFromInsertUnfinished': {
                    q = enteredDisjunct['formula'];
                    help('disintro-next');
                    break;
                }
                case 'callFromInsertFinished': {
                    q = enteredDisjunct['formula'];
                    k = proof.length;
                    renderProof();
                    proof.push(
                        {
                            formula: disjunctionOf(
                                (ruleSelections[2] === 'leftDisjunct') ?
                                    proof[ruleSelections[1]]['formula'] :
                                    JSON.parse(JSON.stringify(enteredDisjunct.formula)),
                                (ruleSelections[2] === 'leftDisjunct') ?
                                    JSON.parse(JSON.stringify(enteredDisjunct.formula)) :
                                    proof[ruleSelections[1]]['formula']
                            ),
                            dependencies: proof[ruleSelections[1]]['dependencies'],
                            inference: rule[0],
                            inferenceSources: [ruleSelections[1]]
                        }
                    );
                    finishRuleApplication();
                    break;
                }
            }
            break;
        }
        case `disjunctionE`: {
            switch (ruleLine) {
                case 1: {
                    g = proofLine;
                    a = proof[proofLine]['dependencies'];
                    p = proof[proofLine]['formula']['left'];
                    q = proof[proofLine]['formula']['right'];
                    renderAll();
                    break;
                }
                case 2: {
                    h = proofLine;
                    renderAll();
                    break;
                }
                case 3: {
                    i = proofLine;
                    b = proof[proofLine]['dependencies'];
                    r = proof[proofLine]['formula'];
                    renderAll();
                    break;
                }
                case 4: {
                    j = proofLine;
                    renderAll();
                    break;
                }
                case 5: {
                    c = proof[proofLine]['dependencies'];
                    m = proof.length;
                    renderProof();
                    proof.push(
                        {
                            formula: proof[ruleSelections[3]]['formula'],
                            dependencies: [...Array(proof.length + 1).keys()].filter(i => proof[ruleSelections[1]]['dependencies'].includes(i) || (proof[ruleSelections[3]]['dependencies'].includes(i) && i !== ruleSelections[2]) || (proof[ruleSelections[5]]['dependencies'].includes(i) && i !== ruleSelections[4])),
                            inference: rule[0],
                            inferenceSources: [ruleSelections[1], ruleSelections[2], ruleSelections[3], ruleSelections[4], ruleSelections[5]]
                        }
                    );
                    finishRuleApplication();
                    break;
                }
            }
            break;
        }
        case `conditionalE`: {
            switch (ruleLine) {
                case 1: {
                    j = proofLine;
                    a = proof[proofLine]['dependencies'];
                    p = proof[proofLine]['formula']['left'];
                    q = proof[proofLine]['formula']['right'];
                    renderAll();
                    break;
                }
                case 2: {
                    k = proofLine;
                    b = proof[proofLine]['dependencies'];//Order may be wrong. Bug or feature?
                    m = proof.length;
                    renderProof();
                    proof.push(
                        {
                            formula: proof[ruleSelections[1]]['formula']['right'],
                            dependencies: [...Array(proof.length + 1).keys()].filter(i => proof[ruleSelections[1]]['dependencies'].includes(i) || proof[ruleSelections[2]]['dependencies'].includes(i)),
                            inference: rule[0],
                            inferenceSources: [ruleSelections[1], ruleSelections[2]]
                        }
                    );
                    finishRuleApplication();
                    break;
                }
            }
            break;
        }
        case `conditionalI`: {
            switch (ruleLine) {
                case 1: {
                    j = proofLine;
                    p = proof[proofLine]['formula']
                    renderAll();
                    break;
                }
                case 2: {
                    k = proofLine;
                    a = proof[proofLine]['dependencies'];
                    m = proof.length;
                    q = proof[proofLine]['formula']
                    renderProof();
                    proof.push(
                        {
                            formula: conditionalOf(proof[ruleSelections[1]]['formula'], proof[ruleSelections[2]]['formula']),
                            dependencies: proof[ruleSelections[2]]['dependencies'].filter(line => line !== ruleSelections[1]),
                            inference: rule[0],
                            inferenceSources: [ruleSelections[1], ruleSelections[2]]
                        }
                    );
                    finishRuleApplication();
                    break;
                }
            }
            break;
        }
        case 'Df': {
            switch (ruleLine) {
                case 1: {
                    j = proofLine;
                    a = proof[proofLine]['dependencies'];
                    if (proof[proofLine]['formula']['type'] === 'biconditional') {
                        p = proof[proofLine]['formula']['left'];
                        q = proof[proofLine]['formula']['right'];
                    } else {
                        p = proof[proofLine]['formula']['left']['left'];
                        q = proof[proofLine]['formula']['left']['right'];
                    }
                    k = proof.length;
                    renderProof();
                    if (proof[proofLine]['formula']['type'] === 'biconditional') {
                        proof.push(
                            {
                                formula: conjunctionOf(conditionalOf(proof[ruleSelections[1]]['formula']['left'], proof[ruleSelections[1]]['formula']['right']), conditionalOf(proof[ruleSelections[1]]['formula']['right'], proof[ruleSelections[1]]['formula']['left'])),
                                dependencies: proof[ruleSelections[1]]['dependencies'],
                                inference: rule[0],
                                inferenceSources: [ruleSelections[1]]
                            }
                        );
                    } else {
                        proof.push(
                            {
                                formula: biconditionalOf(proof[ruleSelections[1]]['formula']['left']['left'], proof[ruleSelections[1]]['formula']['left']['right']),
                                dependencies: proof[ruleSelections[1]]['dependencies'],
                                inference: rule[0],
                                inferenceSources: [ruleSelections[1]]
                            }
                        );
                    }
                    finishRuleApplication();
                    break;
                }
            }
            break;
        }
        case 'DN': {
            switch (ruleLine) {
                case 1: {
                    j = proofLine;
                    a = proof[proofLine]['dependencies'];
                    p = proof[proofLine]['formula']['right']['right'];
                    k = proof.length;
                    renderProof();
                    proof.push(
                        {
                            formula: proof[ruleSelections[1]]['formula']['right']['right'],
                            dependencies: proof[ruleSelections[1]]['dependencies'],
                            inference: rule[0],
                            inferenceSources: [ruleSelections[1]]
                        }
                    );
                    finishRuleApplication();
                    break;
                }
            }
            break;
        }
    }
}

const renderRule = () => {
    switch (ruleSelections[0]) {
        case `negationE`: {
            rule = [`${symbols.negation}E`,
            [a, j, string(negationOf(q))],
            [b, k, string(q)],
            [`${a},${b}`, m, string(theContradiction), `${j},${k} ${symbols.negation}E`]
            ];
            break;
        }
        case `negationI`: {
            rule = [`${symbols.negation}I`,
            [j, j, string(p), 'Assumption'],
            [a, k, string(theContradiction)],
            [`{${a}}&VeryThinSpace;/&VeryThinSpace;${j}`, m, string(negationOf(p)), `${j},${k} ${symbols.negation}I`]
            ];
            break;
        }
        case `conjunctionE`: {
            rule = [`${symbols.conjunction}E`,
            [a, j, string(conjunctionOf(p, q))],
            [a,
                k,
                (ruleSelections[1] === null) ?
                    `${string(p)}&emsp;or&emsp;${string(q)}`
                    :
                    (ruleSelections[2] === 'left') ?
                        string(p)
                        :
                        string(q),
                `${j} ${symbols.conjunction}E`]
            ];
            break;
        }
        case `conjunctionI`: {
            rule = [`${symbols.conjunction}I`,
            [a, j, string(p)],
            [b, k, string(q)],
            [`${a},${b}`, m, string(conjunctionOf(p, q)), `${j},${k} ${symbols.conjunction}I`]
            ];
            break;
        }
        case `disjunctionE`: {
            rule = [`${symbols.disjunction}E`,
            [a, g, string(disjunctionOf(p, q))],
            [h, h, string(p), 'Assumption'],
            [b, i, string(r)],
            [j, j, string(q), 'Assumption'],
            [c, k, string(r)],
            [`{${a}}&thinsp;∪&thinsp;{${b}}&VeryThinSpace;/&VeryThinSpace;${h}&thinsp;∪&thinsp;{${c}}&VeryThinSpace;/&VeryThinSpace;${j}`, m, string(r), `${g},${h},${i},${j},${k} ${symbols.disjunction}E`]
            ];
            break;
        }
        case `disjunctionI`: {
            rule = [`${symbols.disjunction}I`,
            [a, j, string(p)],
            [
                a,
                k,
                (ruleSelections[2] === null) ?
                    (ruleSelections[1] === null) ?
                        `${string(disjunctionOf(p, q))}&emsp;or&emsp;${string(disjunctionOf(q, p))}`
                        :
                        `<span class="selectable" onclick="lineSelection('leftDisjunct')">${string(disjunctionOf(p, q))}</span>&emsp;or&emsp;<span class="selectable" onclick="lineSelection('rightDisjunct')">${string(disjunctionOf(q, p))}</span>`
                    :
                    (ruleSelections[2] === 'leftDisjunct') ?
                        `${stringPar(p)}&emsp13;${symbols.disjunction}&emsp13;${stringPar(q, 'formula')}`
                        :
                        `${stringPar(q, 'formula')}&emsp13;${symbols.disjunction}&emsp13;${stringPar(p)}`,
                `${j} ${symbols.disjunction}I`
            ]
            ];
            break;
        }
        case `conditionalE`: {
            rule = [`${symbols.conditional}E`,
            [a, j, string(conditionalOf(p, q))],
            [b, k, string(p)],
            [`${a},${b}`, m, string(q), `${j},${k} ${symbols.conditional}E`]
            ];
            break;
        }
        case `conditionalI`: {
            rule = [`${symbols.conditional}I`,
            [j, j, string(p), 'Assumption'],
            [a, k, string(q)],
            [`{${a}}&VeryThinSpace;/&VeryThinSpace;${j}`, m, string(conditionalOf(p, q)), `${j},${k} ${symbols.conditional}I`]
            ];
            break;
        }
        case 'Df': {
            rule = ['Df',
                [a, j, `${string(biconditionalOf(p, q))}&emsp;or&emsp;${string(conjunctionOf(conditionalOf(p, q), conditionalOf(q, p)))}`],
                [
                    a,
                    k,
                    (ruleSelections[1] === null) ?
                        `${string(conjunctionOf(conditionalOf(p, q), conditionalOf(q, p)))}&emsp;or&emsp;${string(biconditionalOf(p, q))}`
                        :
                        (proof[ruleSelections[1]]['formula']['type'] === 'biconditional') ?
                            string(conjunctionOf(conditionalOf(p, q), conditionalOf(q, p)))
                            :
                            string(biconditionalOf(p, q)),
                    `${j} Df`
                ]
            ];
            break;
        }
        case 'DN': {
            rule = ['DN',
                [a, j, string(negationOf(negationOf(p)))],
                [a, k, string(p), `${j} DN`]
            ];
            break;
        }
        default: {
            rule = null;
        }
    }
    firsthtml = "";
    secondhtml = "";
    if (ruleSelections[0] !== null) {
        firsthtml += `<div class="tableRowSeperator"></div>
            <div class="tableRowRulename">
                <div class="tableCellRulename" colspan="2">Rule of ${rule[0]}</div>
            </div>`
        for (var line = 1; line < rule.length; line++) {
            if (line < rule.length - 1) {
                firsthtml += `<div class="tableRow ruleLine${waitingForInput(line)}">
                        <div class="tableCell">${rule[line][0]}</div>
                        <div class="tableCell">(${rule[line][1]})</div>
                        <div class="tableCell">${rule[line][2]}</div>`
                if (rule[line][3]) {
                    firsthtml += `<div class="tableCell">${rule[line][3]}</div>`
                }
                firsthtml += `</div>
                    <div class="tableRowVdots">
                        <div class="tableCellVdots"></div><div class="tableCellVdots">&#8942;</div>
                    </div>`
            } else {
                secondhtml += `<div class="tableRow ruleLine">
                        <div class="tableCell">${rule[line][0]}</div>
                        <div class="tableCell">(${rule[line][1]})</div>
                        <div class="tableCell">${rule[line][2]}</div>
                        <div class="tableCell">${rule[line][3]}</div>
                    </div>`
            }
        }
    }
    $("#vanishing").html(firsthtml);
    $("#newline").html(secondhtml);
}

const waitingForInput = (ruleLine) => {
    if (ruleSelections[ruleLine] === null && ruleSelections[ruleLine - 1] !== null) {
        return ' active';
    } else {
        return '';
    }
}

const renderAll = () => {
    renderProof();
    renderRule();
}

const finishRuleApplication = () => {
    buttonsActive({
        premiseOrAssumption: false,
        symbolInput: false,
        inference: false,
        reset: false,
        cancel: false
    });
    renderRule();
    help();
    $("#vanishing").fadeOut(500, () => {
        $("#vanishing").css({ "visibility": "hidden", display: 'block' }).slideUp(500, () => {
            resetRuleVariablesAndSelections();
            renderAll();
            $("#vanishing").show();
            $("#vanishing").css('visibility', 'visible');
            buttonsActive({
                premiseOrAssumption: true,
                inference: true,
                cancel: true,
                reset: true,
                settings: true,
                finish: finishReady()
            });
            help('noactiveinput-existinglines');
        })
    });
}

const negationOf = (right) => { return { type: 'negation', right: right } }
const conjunctionOf = (left, right) => { return { type: 'conjunction', left: left, right: right } }
const disjunctionOf = (left, right) => { return { type: 'disjunction', left: left, right: right } }
const conditionalOf = (left, right) => { return { type: 'conditional', left: left, right: right } }
const biconditionalOf = (left, right) => { return { type: 'biconditional', left: left, right: right } }
const theContradiction = { type: 'contradiction' };

const finishReady = () => {
    if (proof.length === 1) {
        return false;
    } else {
        for (var dependency of proof[proof.length - 1]['dependencies']) {
            if (proof[dependency]['inference'] !== 'Premise') {
                return false;
            }
        }
        return true;
    }
}

const finishProof = () => {
    buttonsActive({
        symbolInput: false,
        premiseOrAssumption: false,
        inference: false,
        reset: true,
        cancel: true,
        settings: true,
        finish: false
    });
    var conclusion = proof[proof.length - 1]['formula'];
    var premises = [];
    var html = '<div id="sequent">';
    var commaBefore = false;
    for (i = 1; i < proof.length; i++) {
        if (proof[i]['inference'] === 'Premise') {
            premises.push(proof[i]['formula']);
            if (commaBefore) {
                html += ', ';
            }
            html += string(proof[i]['formula']);
            commaBefore = true;
        }
    }
    html += ' ⊢ ' + string(conclusion) + '</div>';
    $("#sequent-wrapper").html(html);
    proofIsFinished = true;
    help('finished');
}

let a, b, c, g, h, i, j, k, m, p, q, r, enteredDisjunct, ruleSelections, rule;
const resetRuleVariablesAndSelections = () => {
    a = 'a<sub>1</sub>,...,a<sub>n</sub>';
    b = 'b<sub>1</sub>,...,b<sub>u</sub>';
    c = 'c<sub>1</sub>,...,c<sub>w</sub>';
    g = 'g'; h = 'h'; i = 'i'; j = 'j'; k = 'k'; m = 'm';
    p = { type: 'atomic', letter: 'p' };
    q = { type: 'atomic', letter: 'q' };
    r = { type: 'atomic', letter: 'r' };
    enteredDisjunct = { formula: { type: 'empty', letter: '_' } };
    ruleSelections = [null, null, null, null, null, null];
    rule = null;
}

const cancel = (fromCancelButton = false) => {
    if (activeFormula && ruleSelections[0] === null) {
        proof.splice(activeFormula.split(".")[0], 1);
    } else if (fromCancelButton && ruleSelections[0] === null && !proofIsFinished) {
        proof.pop();
    }
    activeElement = null;
    activeFormula = null;
    resetRuleVariablesAndSelections();
    renderAll();
    $("#sequent-wrapper").html('');
    proofIsFinished = false;
    buttonsActive({
        symbolInput: false,
        premiseOrAssumption: true,
        inference: proof.length > 1,
        reset: proof.length > 1,
        cancel: proof.length > 1,
        settings: true,
        finish: finishReady()
    });
    help((proof.length === 1) ? 'noactiveinput-nolines' : 'noactiveinput-existinglines');
    if (fromCancelButton) {
        showDeleteCandidates();
    }
}

const reset = () => {
    proof = [null];
    activeElement = null;
    activeFormula = null;
    justLoaded = false;
    resetRuleVariablesAndSelections();
    renderAll();
    $("#sequent-wrapper").html('');
    proofIsFinished = false;
    $("#vanishing").show();
    $("#vanishing").css('visibility', 'visible');
    buttonsActive({
        symbolInput: false,
        premiseOrAssumption: true,
        inference: false,
        reset: false,
        cancel: false,
        settings: true,
        finish: false
    });
    help('noactiveinput-nolines');
}

const help = (id = '') => {
    $("#help").children().css("display", "none");
    if (id) {
        $(`#${id}`).css("display", "block");
    }
    if (id === 'noactiveinput-existinglines') {
        if (finishReady()) {
            $("#finish-ready").css("display", "block");
            $("#not-finish-ready").css("display", "none");
        } else {
            $("#finish-ready").css("display", "none");
            $("#not-finish-ready").css("display", "block");
        }
    }
}

const createButton = (onclick, label, buttonClass, buttonID, location, onenter = null, onleave = null) => {
    const button = document.createElement('button');
    button.setAttribute('onclick', onclick);
    button.setAttribute('class', buttonClass);
    button.setAttribute('ID', buttonID);
    button.innerHTML = label;
    if (onenter) {
        button.setAttribute('onmouseenter', onenter);
        button.setAttribute('onmouseleave', onleave);
    }
    document.getElementById(location).appendChild(button);
}

const showDeleteCandidates = () => {
    if (proofIsFinished) {
        addRed('#sequent, .active');
    } else if (ruleSelections[0]) {
        addRed('.ruleLine, .active');
    } else {
        addRed('.finalLine, .active');
    }
}

const unshowDeleteCandidates = () => {
    if (proofIsFinished) {
        removeRed('#sequent, .active');
    } else if (ruleSelections[0]) {
        removeRed('.ruleLine, .active');
    } else {
        removeRed('.finalLine, .active');
    }
}

const showDeleteCandidatesRules = () => {
    if (ruleSelections[0]) {
        addRed('.ruleLine, .active');
    } else if (activeElement) {
        addRed('.finalLine, .active');
    }
}

const unshowDeleteCandidatesRules = () => {
    if (ruleSelections[0]) {
        removeRed('.ruleLine, .active');
    } else if (activeElement) {
        removeRed('.finalLine, .active');
    }
}

const showDeleteCandidatesAll = () => {
    addRed('.tableRow, #sequent, .active');
}

const unshowDeleteCandidatesAll = () => {
    removeRed('.tableRow, #sequent, .active');
}

let timeoutID
const addRed = (domClassOrID) => {
    if (!justLoaded) {
        timeoutID = setTimeout(() => {
            $(domClassOrID).css('background', 'var(--delete-color)');
            $(domClassOrID).css('color', 'var(--delete-text-color)');
        }, 100);
    }
}

const removeRed = (domClassOrID) => {
    clearTimeout(timeoutID);
    $(domClassOrID).css('background', '');
    $(domClassOrID).css('color', '');
}

const buttonsActive = (classesWithBoolean, IDsWithBoolean = []) => {
    for (const [key, value] of Object.entries(classesWithBoolean)) {
        $(`.${key}`).attr('disabled', !value);
    }
    for (const [key, value] of Object.entries(IDsWithBoolean)) {
        $(`#${key}`).attr('disabled', !value);
    }
}



//Initialisation
let justLoaded = true;
let proofIsFinished = true;
let proof = [null];
let activeElement;
let activeFormula;
let symbols = {
    negation: '¬',
    conjunction: '&',
    disjunction: '∨',
    conditional: '→',
    biconditional: '↔',
    contradiction: '⊥'
};
resetRuleVariablesAndSelections();
createButton(`addPremiseOrAssumption('Premise')`, 'Add premise', 'premiseOrAssumption', 'Addpremise', 'add', 'showDeleteCandidatesRules()', 'unshowDeleteCandidatesRules()');
createButton(`addPremiseOrAssumption('Assumption')`, 'Add assumption', 'premiseOrAssumption', 'Addassumption', 'add', 'showDeleteCandidatesRules()', 'unshowDeleteCandidatesRules()');
['negation', 'conjunction', 'disjunction', 'conditional'].forEach(connective => {
    createButton(`ruleSelection('${connective}E')`, `${symbols[connective]}E`, 'inference', `${connective}E`, 'elim', 'showDeleteCandidatesRules()', 'unshowDeleteCandidatesRules()');
})
createButton(`ruleSelection('DN')`, `DN`, 'inference', 'DN', 'elim', 'showDeleteCandidatesRules()', 'unshowDeleteCandidatesRules()');
['negation', 'conjunction', 'disjunction', 'conditional'].forEach(connective => {
    createButton(`ruleSelection('${connective}I')`, `${symbols[connective]}I`, 'inference', `${connective}I`, 'intro', 'showDeleteCandidatesRules()', 'unshowDeleteCandidatesRules()');
})
createButton(`ruleSelection('Df')`, `Df`, 'inference', `Df`, 'intro', 'showDeleteCandidatesRules()', 'unshowDeleteCandidatesRules()');
Object.keys(symbols).forEach(connective => {
    if (connective !== 'contradiction') {
        createButton(`insert("${connective}","")`, symbols[connective], 'symbolInput', connective, 'con')
    }
});
createButton(`insert("contradiction",'')`, symbols.contradiction, 'symbolInput', 'contradiction', 'letter');
['A', 'B', 'C', 'D'].forEach(letter => {
    createButton(`insert("atomic","${letter}")`, letter, 'symbolInput', letter, 'letter')
});
createButton('cancel(true)', 'Clear latest', 'cancel', 'cancel', 'delete', 'showDeleteCandidates()', 'unshowDeleteCandidates()');
createButton('reset()', 'Clear all', 'reset', 'reset', 'delete', 'showDeleteCandidatesAll()', 'unshowDeleteCandidatesAll()');
createButton('finishProof()', 'Finish proof', 'finish', 'finish', 'finish');
createButton('openSettings()', 'Settings', 'settings', 'settings', 'finish');
buttonsActive({
    premiseOrAssumption: false,
    symbolInput: false,
    inference: false,
    reset: true,
    cancel: false,
    settings: false,
    finish: false
});



//Settings menu
const openSettings = () => {
    $("#dialog").dialog("open");
}

$("#dialog").dialog({ autoOpen: false, modal: true });

$('#symbolSelection').submit(function (e) {
    e.preventDefault();
})

$('#symbolSelection input').on('change', () => {
    Object.keys(symbols).forEach(symbol => {
        symbols[symbol] = $(`input[name=${symbol}]:checked`, '#symbolSelection').val();
    });
    ['negation', 'conjunction', 'disjunction', 'conditional'].forEach(connective => {
        $(`#${connective}E`).html(`${symbols[connective]}E`);
        $(`#${connective}I`).html(`${symbols[connective]}I`);
        $(`#${connective}`).html(symbols[connective]);
    });
    $(`#biconditional`).html(symbols['biconditional']);
    $(`#contradiction`).html(symbols['contradiction']);
    renderAll();
    if (proofIsFinished) {
        finishProof();
    }
});

$("#propositionalLetters").keyup(function () {
    let stringOfLetters = $("#propositionalLetters").val();
    $('#letter').html('');
    createButton(`insert("contradiction",'')`, symbols.contradiction, 'symbolInput', 'contradiction', 'letter');
    [...stringOfLetters.toUpperCase().replace(/[^a-z]/gi, '')].forEach(letter => {
        createButton(`insert("atomic","${letter}")`, letter, 'symbolInput', letter, 'letter')
    });
    buttonsActive({ symbolInput: false });
});