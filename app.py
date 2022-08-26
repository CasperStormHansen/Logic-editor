# from asyncio.windows_events import NULL
from ipaddress import ip_address
from flask import Flask, request
import flask
import json
from flask_cors import CORS
from itertools import permutations
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
# from os import environ

app = Flask(__name__)
CORS(app)
# environ.get('DATABASE_URL')
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://casperstormhansen:OJAg9kciAgm9dNDNm131hKJEfWF6ukvp@dpg-cc45k85a4994c9qc2dtg-a/db_wqz1' or 'sqlite:///db.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # to supress warning
db = SQLAlchemy(app)


class database_of_proofs(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sequent = db.Column(db.String(), index=True, unique=True)
    proof = db.Column(db.PickleType)


class log(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sequent = db.Column(db.String(), index=True)
    proof = db.Column(db.PickleType)
    ip = db.Column(db.String())
    timestamp = db.Column(db.DateTime())


# db.create_all()  # creates database - to be run only once


@app.route('/database', methods=["GET", "POST"])
def compareProof():
    received_data = request.get_json()
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
        for i in range(len(list_of_letters)):
            sequent = sequent.replace(list_of_letters[i], str(i))
        sequents.append(sequent)
    canonical_eqv_class_representive = sorted(sequents)[0]
    # create log entry
    new_log_entry = log(
        sequent=canonical_eqv_class_representive,
        proof=new_proof,
        ip=request.remote_addr,
        timestamp=datetime.now()
    )
    db.session.add(new_log_entry)
    db.session.commit()
    # search database of proofs for match
    entry = database_of_proofs.query.filter(
        database_of_proofs.sequent == canonical_eqv_class_representive).first()
    if entry:
        old_proof = entry.proof
        if len(new_proof) < len(old_proof):
            return_data = {
                'msg': 'This sequent has been proved before in this proof editor, but your proof is the shortest yet! <span class="render-old-proof" onclick=renderOldProof()>Click here</span> to see the previous record.',
                'old_proof': old_proof
            }
            entry.proof = new_proof
            db.session.commit()
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
        new_entry = database_of_proofs(
            sequent=canonical_eqv_class_representive,
            proof=new_proof
        )
        db.session.add(new_entry)
        try:
            db.session.commit()
        except:
            db.session.rollback()
    return flask.Response(response=json.dumps(return_data), status=201)


def string(formula):
    global list_of_letters
    if formula['type'] == 'atomic':
        if formula['letter'] not in list_of_letters:
            list_of_letters.append(formula['letter'])
        return formula['letter']
    elif formula['type'] == 'contradiction':
        return '⊥'
    elif formula['type'] == 'negation':
        return f"(¬{string(formula['right'])})"
    elif formula['type'] == 'conjunction':
        return f"({string(formula['left'])}&{string(formula['right'])})"
    elif formula['type'] == 'disjunction':
        return f"({string(formula['left'])}∨{string(formula['right'])})"
    elif formula['type'] == 'conditional':
        return f"({string(formula['left'])}→{string(formula['right'])})"
    elif formula['type'] == 'biconditional':
        return f"({string(formula['left'])}↔{string(formula['right'])})"
    # match is from python 3.10 which is not supported by render.com
    # match formula['type']:
    #     case 'atomic':
    #         if formula['letter'] not in list_of_letters:
    #             list_of_letters.append(formula['letter'])
    #         return formula['letter']
    #     case 'contradiction':
    #         return '⊥'
    #     case 'negation':
    #         return f"(¬{string(formula['right'])})"
    #     case 'conjunction':
    #         return f"({string(formula['left'])}&{string(formula['right'])})"
    #     case 'disjunction':
    #         return f"({string(formula['left'])}∨{string(formula['right'])})"
    #     case 'conditional':
    #         return f"({string(formula['left'])}→{string(formula['right'])})"
    #     case 'biconditional':
    #         return f"({string(formula['left'])}↔{string(formula['right'])})"


if __name__ == "__main__":
    app.run("localhost", 6969)
