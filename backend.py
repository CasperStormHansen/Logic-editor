from asyncio.windows_events import NULL
from flask import Flask, request
import flask
import json
from flask_cors import CORS
from itertools import permutations

app = Flask(__name__)
CORS(app)

database_of_proofs = {}


@app.route('/database', methods=["GET", "POST"])
def compareProof():
    received_data = request.get_json()
    print(f"received data: {received_data}")
    new_proof = received_data['data']
    premises = []
    for i in range(1, len(new_proof)):
        if new_proof[i]['inference'] == 'Premise':
            premises.append(new_proof[i]['formula'])
    conclusion = new_proof[-1]['formula']
    permutations_of_premises = permutations(premises)
    global sequents
    sequents = []
    global list_of_letters
    for permutation in permutations_of_premises:
        list_of_letters = []
        sequent = ''
        for premise in permutation:
            sequent += string(premise) + ','
        sequent += string(conclusion)
        print(sequent, list_of_letters)
        for i in range(len(list_of_letters)):
            sequent = sequent.replace(list_of_letters[i], str(i))
        print(sequent)
        sequents.append(sequent)
    canonical_eqv_class_representive = sorted(sequents)[0]
    if canonical_eqv_class_representive in database_of_proofs:
        old_proof = database_of_proofs[canonical_eqv_class_representive]
        if len(new_proof) < len(old_proof):
            return_data = {
                'msg': 'This sequent has been proved before in this proof editor, but your proof is the shortest yet! <span class="render-old-proof" onclick=renderOldProof()>Click here</span> to see the previous record.',
                'old_proof': old_proof
            }
            database_of_proofs[canonical_eqv_class_representive] = new_proof
            print(database_of_proofs)
        elif len(new_proof) == len(old_proof):
            return_data = {
                'msg': 'This sequent has been proved before in this proof editor. Your proof&apos;s length matches that of the shortest previous proof. <span class="render-old-proof" onclick=renderOldProof()>Click here</span> to see the proof made by the record holder.',
                'old_proof': old_proof
            }
        else:
            return_data = {
                'msg': 'This sequent has been proved before in this proof editor, and in fewer lines. <span class="render-old-proof" onclick=renderOldProof()>Click here</span> to see the proof made by the record holder.',
                'old_proof': old_proof
            }
    else:
        return_data = {
            'msg': 'You are the first user to prove this sequent!',
            'old_proof': None
        }
        database_of_proofs[canonical_eqv_class_representive] = new_proof
        print(database_of_proofs)
    return flask.Response(response=json.dumps(return_data), status=201)


def string(formula):
    global list_of_letters
    match formula['type']:
        case 'atomic':
            if formula['letter'] not in list_of_letters:
                list_of_letters.append(formula['letter'])
                print("44 list of letters: ", list_of_letters)
            return formula['letter']
        case 'contradiction':
            return '⊥'
        case 'negation':
            return f"(¬{string(formula['right'])})"
        case 'conjunction':
            print("52 list of letters: ", list_of_letters)
            return f"({string(formula['left'])}&{string(formula['right'])})"
        case 'disjunction':
            return f"({string(formula['left'])}∨{string(formula['right'])})"
        case 'conditional':
            return f"({string(formula['left'])}→{string(formula['right'])})"
        case 'biconditional':
            return f"({string(formula['left'])}↔{string(formula['right'])})"


if __name__ == "__main__":
    app.run("localhost", 6969)
